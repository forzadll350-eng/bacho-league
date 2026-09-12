const MAX_BODY_BYTES = 16 * 1024

function send(res, status, body) {
  res.status(status).json(body)
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && Buffer.byteLength(req.body, 'utf8') <= MAX_BODY_BYTES) {
    return JSON.parse(req.body)
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return send(res, 405, { ok: false, error: 'method_not_allowed' })
  }

  const rawLength = Number(req.headers['content-length'] || 0)
  if (rawLength > MAX_BODY_BYTES) {
    return send(res, 413, { ok: false, error: 'payload_too_large' })
  }

  let payload
  try {
    payload = parseBody(req)
  } catch {
    return send(res, 400, { ok: false, error: 'invalid_json' })
  }
  if (payload && Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_BODY_BYTES) {
    return send(res, 413, { ok: false, error: 'payload_too_large' })
  }

  const kind = payload?.kind
  const recordId = payload?.recordId
  if (
    (kind !== 'athlete' && kind !== 'attendee') ||
    typeof recordId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recordId)
  ) {
    return send(res, 400, { ok: false, error: 'invalid_registration' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  const sheetsUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  const sheetsSecret = process.env.GOOGLE_SHEETS_SHARED_SECRET
  if (!supabaseUrl || !supabaseKey || !sheetsUrl || !sheetsSecret) {
    return send(res, 503, { ok: false, error: 'server_not_configured' })
  }

  try {
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/sheet_registration_matches`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_kind: kind, p_id: recordId, p_payload: payload }),
      signal: AbortSignal.timeout(8_000),
    })
    const verified = verifyResponse.ok ? await verifyResponse.json() : false
    if (verified !== true) {
      return send(res, 403, { ok: false, error: 'registration_not_verified' })
    }

    const sheetsResponse = await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...payload,
        secret: sheetsSecret,
        proxiedAt: new Date().toISOString(),
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    })

    const resultText = await sheetsResponse.text()
    let result = null
    try {
      result = resultText ? JSON.parse(resultText) : null
    } catch {
      // Apps Script can respond with HTML/plain text on deployment errors.
    }
    if (!sheetsResponse.ok || result?.ok !== true) {
      return send(res, 502, { ok: false, error: 'sheets_rejected' })
    }
  } catch {
    return send(res, 502, { ok: false, error: 'upstream_unavailable' })
  }

  return send(res, 200, { ok: true })
}

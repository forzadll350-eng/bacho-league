const SPREADSHEET_ID = '1pNtuMt1CTx7e6BS5685LoR26xdGiStewxN2ZWq2FXp0'
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

const ATTENDEE_SHEETS = [
  {
    name: 'ลงทะเบียนผู้เข้าร่วม',
    category: 'attendee',
    query: 'select B,C,E where C is not null',
    positionIndex: 2,
  },
]

const POSITION_LABELS = {
  admin_exec: 'ฝ่ายบริหาร',
  council: 'สมาชิกสภา',
  civil_servant: 'ข้าราชการ',
  mission: 'ภารกิจ',
  general: 'ทั่วไป',
  contract: 'จ้างเหมา',
}

const TEAM_IDS = new Map([
  ['อบต.ลุโบะสาวอ', 'lubosawo'],
  ['อบต.ปะลุกาสาเมาะ', 'palukasamoh'],
  ['เทศบาลตำบลต้นไทร', 'tonsai'],
  ['อบต.บาเระใต้', 'barehtai'],
  ['อบต.บาเระเหนือ', 'bare-nuea'],
  ['อบต.บาเจาะ', 'bacho-sao'],
  ['อบต.กาเยาะมาตี', 'kayoh-mati'],
  ['เทศบาลตำบลบาเจาะ', 'bacho-municipal'],
])
const TEAM_ID_VALUES = new Set(TEAM_IDS.values())
const HIDDEN_FULL_NAMES = new Set([
  'testtest2',
  'testtes2',
  'นายอาลีฟดอเล๊าะ',
])

function normalizeOrg(value) {
  return String(value ?? '')
    .trim()
    .replaceAll('บาเราะ', 'บาเระ')
    .replace(/\s+/g, '')
}

function normalizeName(value) {
  return String(value ?? '').trim().toLocaleLowerCase('th').replace(/\s+/g, '')
}

function cleanCell(cell, maxLength = 120) {
  const printable = Array.from(String(cell?.f ?? cell?.v ?? ''), (character) => {
    const code = character.charCodeAt(0)
    return code < 32 || code === 127 ? ' ' : character
  }).join('')
  return printable
    .trim()
    .slice(0, maxLength)
}

function parseGoogleResponse(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_RESPONSE_BYTES) {
    throw new Error('sheet_response_too_large')
  }
  const start = text.indexOf('{')
  const end = text.lastIndexOf(')')
  if (start < 0 || end <= start) throw new Error('invalid_sheet_response')
  const payload = JSON.parse(text.slice(start, end))
  if (payload?.status !== 'ok' || !Array.isArray(payload?.table?.rows)) {
    throw new Error('sheet_query_failed')
  }
  return payload.table.rows
}

function buildQueryUrl(sheet) {
  const params = new URLSearchParams({
    tqx: 'out:json',
    sheet: sheet.name,
    tq: sheet.query,
  })
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?${params}`
}

async function loadSheetEntries(sheet) {
  const response = await fetch(buildQueryUrl(sheet), {
    headers: { Accept: 'application/javascript' },
    redirect: 'follow',
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error('sheet_unavailable')

  const rows = parseGoogleResponse(await response.text())
  return rows.flatMap((row, rowIndex) => {
    const cells = row?.c ?? []
    const org = cleanCell(cells[0])
    const fullName = cleanCell(cells[1])
    const teamId = TEAM_IDS.get(normalizeOrg(org))
    if (!teamId || fullName.length < 2 || HIDDEN_FULL_NAMES.has(normalizeName(fullName))) return []

    const positionLabel = cleanCell(cells[sheet.positionIndex]) || 'ไม่ระบุตำแหน่ง'
    const jerseyNumber = sheet.jerseyIndex == null
      ? undefined
      : cleanCell(cells[sheet.jerseyIndex], 20) || undefined

    return [{
      id: `${sheet.category}-${teamId}-${rowIndex + 1}`,
      category: sheet.category,
      teamId,
      fullName,
      positionLabel,
      jerseyNumber,
    }]
  })
}

async function loadPublicAthletes() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('server_not_configured')

  const params = new URLSearchParams({
    select: 'id,sport,team_id,full_name,position,jersey_number',
    order: 'team_id,sport,full_name',
  })
  const response = await fetch(`${supabaseUrl}/rest/v1/public_player_roster?${params}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error('athlete_roster_unavailable')

  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('invalid_athlete_roster')
  return rows.flatMap((row) => {
    if (
      !TEAM_ID_VALUES.has(row.team_id)
      || (row.sport !== 'football' && row.sport !== 'volleyball')
    ) return []

    const fullName = cleanCell({ v: row.full_name })
    if (fullName.length < 2 || HIDDEN_FULL_NAMES.has(normalizeName(fullName))) return []
    return [{
      id: String(row.id),
      category: row.sport,
      teamId: row.team_id,
      fullName,
      positionLabel: POSITION_LABELS[row.position] ?? cleanCell({ v: row.position }),
      jerseyNumber: row.sport === 'football'
        ? cleanCell({ v: row.jersey_number }, 20) || undefined
        : undefined,
    }]
  })
}

export async function loadPublicRegistrationRoster() {
  const [athletes, attendeeGroups] = await Promise.all([
    loadPublicAthletes(),
    Promise.all(ATTENDEE_SHEETS.map(loadSheetEntries)),
  ])
  return [...athletes, ...attendeeGroups.flat()].sort((left, right) => (
    left.teamId.localeCompare(right.teamId)
      || left.category.localeCompare(right.category)
      || left.fullName.localeCompare(right.fullName, 'th')
  ))
}

function send(res, status, body) {
  res.status(status).json(body)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return send(res, 405, { ok: false, error: 'method_not_allowed' })
  }

  try {
    const entries = await loadPublicRegistrationRoster()
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120')
    return send(res, 200, { ok: true, entries })
  } catch {
    res.setHeader('Cache-Control', 'no-store')
    return send(res, 502, { ok: false, error: 'roster_unavailable' })
  }
}

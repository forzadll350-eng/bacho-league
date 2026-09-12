/**
 * ส่งแถวลงทะเบียนไป Google Apps Script Web App (append ลง Sheet)
 * ตั้งค่า VITE_GOOGLE_SHEETS_WEBHOOK_URL ใน .env / Vercel
 * ล้มเหลวไม่กระทบการลงทะเบียนในแอป
 */

export type SheetAthletePayload = {
  kind: 'athlete'
  sport: 'football' | 'volleyball'
  sportLabel: string
  teamId: string
  teamName: string
  fullName: string
  position: string
  positionLabel: string
  age: number
  jerseyNumber: string
  photoUrl: string
}

export type SheetAttendeePayload = {
  kind: 'attendee'
  teamId: string
  teamName: string
  fullName: string
  phone: string
  positionLabel: string
  subdistrict: string
  note: string
}

export type SheetRegistrationPayload = SheetAthletePayload | SheetAttendeePayload

const webhookUrl = () =>
  (import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL as string | undefined)?.trim() || ''

export function isGoogleSheetsWebhookConfigured(): boolean {
  return Boolean(webhookUrl())
}

type SheetResponse = {
  ok?: boolean
  error?: string
}

/** รอให้ Apps Script รับข้อมูลก่อนจบการลงทะเบียน แต่ไม่ทำให้ข้อมูลใน Supabase ซ้ำเมื่อชีตล่ม */
export async function pushRegistrationToSheet(
  payload: SheetRegistrationPayload,
): Promise<void> {
  const url = webhookUrl()
  if (!url) return

  try {
    // text/plain หลีก preflight; ไม่ใช้ no-cors เพื่อให้ body ไปถึง Apps Script ครบ
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...payload,
        submittedAt: new Date().toISOString(),
      }),
      redirect: 'follow',
      keepalive: true,
    })
    const raw = await response.text()
    let result: SheetResponse | null = null
    try {
      result = raw ? (JSON.parse(raw) as SheetResponse) : null
    } catch {
      // Apps Script บาง deployment ตอบเป็นข้อความธรรมดา
    }
    if (!response.ok || result?.ok === false) {
      console.warn('[googleSheets] push rejected', result?.error || response.statusText)
    }
  } catch (err) {
    console.warn('[googleSheets] push failed', err)
  }
}

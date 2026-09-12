/**
 * ส่งแถวลงทะเบียนไป Google Apps Script Web App (append ลง Sheet)
 * ส่งผ่าน server-side proxy เพื่อไม่เปิดเผย URL/secret ของ Apps Script ใน bundle
 * ล้มเหลวไม่กระทบการลงทะเบียนในแอป
 */

export type SheetAthletePayload = {
  kind: 'athlete'
  recordId: string
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
  recordId: string
  teamId: string
  teamName: string
  fullName: string
  phone: string
  positionLabel: string
  subdistrict: string
  note: string
}

export type SheetRegistrationPayload = SheetAthletePayload | SheetAttendeePayload

type SheetResponse = {
  ok?: boolean
  error?: string
}

/** รอให้ Apps Script รับข้อมูลก่อนจบการลงทะเบียน แต่ไม่ทำให้ข้อมูลใน Supabase ซ้ำเมื่อชีตล่ม */
export async function pushRegistrationToSheet(
  payload: SheetRegistrationPayload,
): Promise<void> {
  try {
    const response = await fetch('/api/google-sheets-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

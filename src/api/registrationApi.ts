import { TEAM_LIST } from '../data/teams'
import { pushRegistrationToSheet } from '../lib/googleSheetsWebhook'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { PlayerPosition, SportType } from '../types/sports'

export const POSITION_OPTIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'admin_exec', label: 'ฝ่ายบริหาร' },
  { value: 'council', label: 'สมาชิกสภา' },
  { value: 'civil_servant', label: 'ข้าราชการ' },
  { value: 'mission', label: 'ภารกิจ' },
  { value: 'general', label: 'ทั่วไป' },
  { value: 'contract', label: 'จ้างเหมา' },
]

/** ตำแหน่งผู้เข้าร่วม — เพิ่ม อื่นๆ แล้วกรอกเองได้ */
export type AttendeePosition = PlayerPosition | 'other'

export const ATTENDEE_POSITION_OPTIONS: { value: AttendeePosition; label: string }[] = [
  ...POSITION_OPTIONS,
  { value: 'other', label: 'อื่นๆ' },
]

/** จ้างเหมาฟุตซอลเท่านั้น ต้องอายุ ≥ 35 */
export const FUTSAL_CONTRACT_MIN_AGE = 35

export function validateFutsalAge(position: PlayerPosition, age: number): string | null {
  if (!Number.isFinite(age) || age < 10 || age > 80) {
    return 'กรุณากรอกอายุให้ถูกต้อง'
  }
  if (position === 'contract' && age < FUTSAL_CONTRACT_MIN_AGE) {
    return 'จ้างเหมาต้องอายุ 35 ปีขึ้นไป'
  }
  return null
}

export const FUTSAL_REG_LIMIT = 20

/** ปิดรับลงทะเบียนนักกีฬา/ผู้เข้าร่วม หลัง 19 ก.ย. 2569 เวลา 17:00 (เวลาไทย) */
export const REGISTRATION_DEADLINE = new Date('2026-09-19T17:00:00+07:00')

export const REGISTRATION_CLOSED_MESSAGE =
  'หมดเวลาลงทะเบียนแล้ว ระบบรับถึงวันที่ 19 ก.ย. 2569 เวลา 17:00 น. เท่านั้น'

export function isRegistrationOpen(now: Date = new Date()): boolean {
  return now.getTime() <= REGISTRATION_DEADLINE.getTime()
}

export function assertRegistrationOpen(now: Date = new Date()): void {
  if (!isRegistrationOpen(now)) {
    throw new Error(REGISTRATION_CLOSED_MESSAGE)
  }
}

/** เบอร์เสื้อฟุตซอล — trim และตัด 0 นำหน้าของตัวเลขให้เทียบกันได้ */
export function normalizeJersey(value: string): string {
  const t = value.trim()
  if (!t) return ''
  if (/^\d+$/.test(t)) return String(Number(t))
  return t
}

export async function countTeamRegistrations(
  sport: SportType,
  teamId: string,
): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('registrations')
    .select('*', { count: 'exact', head: true })
    .eq('sport', sport)
    .eq('team_id', teamId)
  if (error) throw error
  return count ?? 0
}

/** คืนชื่อผู้ที่ถือเบอร์นี้แล้วในอปท. (ฟุตซอล) หรือ null ถ้ายังว่าง */
export async function findFutsalJerseyHolder(
  teamId: string,
  jerseyNumber: string,
): Promise<string | null> {
  if (!supabase) return null
  const want = normalizeJersey(jerseyNumber)
  if (!want) return null

  const { data, error } = await supabase
    .from('registrations')
    .select('full_name, jersey_number')
    .eq('sport', 'football')
    .eq('team_id', teamId)
  if (error) throw error

  const hit = (data ?? []).find((r) => normalizeJersey(r.jersey_number ?? '') === want)
  return hit?.full_name ?? null
}

export async function uploadPlayerPhoto(file: File, teamId: string): Promise<string> {
  if (!supabase) throw new Error('ยังไม่ได้เชื่อม Supabase')
  if (file.size > 2 * 1024 * 1024) throw new Error('รูปต้องไม่เกิน 2 MB')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${teamId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('player-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
  return data.publicUrl
}

export type RegistrationInput = {
  sport: SportType
  teamId: string
  fullName: string
  position: PlayerPosition
  age: number
  jerseyNumber?: string
  photoUrl?: string
}

export async function submitRegistration(input: RegistrationInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('ยังไม่ได้เชื่อมฐานข้อมูล')
  }

  assertRegistrationOpen()

  const jersey =
    input.jerseyNumber != null && input.jerseyNumber.trim()
      ? normalizeJersey(input.jerseyNumber)
      : null

  if (input.sport === 'football') {
    const ageErr = validateFutsalAge(input.position, input.age)
    if (ageErr) throw new Error(ageErr)

    if (!jersey) {
      throw new Error('กรุณากรอกเบอร์เสื้อ')
    }

    const holder = await findFutsalJerseyHolder(input.teamId, jersey)
    if (holder) {
      throw new Error(`เบอร์นี้ ${holder} ลงทะเบียนไว้แล้ว`)
    }

    const n = await countTeamRegistrations('football', input.teamId)
    if (n >= FUTSAL_REG_LIMIT) {
      throw new Error('อปท.นี้ลงทะเบียนฟุตซอลครบ 20 คนแล้ว')
    }
  }

  const { error } = await supabase.from('registrations').insert({
    sport: input.sport,
    team_id: input.teamId,
    full_name: input.fullName.trim(),
    position: input.position,
    age: input.age,
    jersey_number: jersey,
    photo_url: input.photoUrl || null,
  })

  if (error) {
    if (error.code === '23505') {
      const holder = jersey
        ? await findFutsalJerseyHolder(input.teamId, jersey)
        : null
      throw new Error(
        holder
          ? `เบอร์นี้ ${holder} ลงทะเบียนไว้แล้ว`
          : 'เบอร์เสื้อนี้มีในระบบแล้ว',
      )
    }
    if (error.message?.includes('check') || error.code === '42501') {
      throw new Error('ลงทะเบียนไม่สำเร็จ — อาจครบโควต้าแล้ว')
    }
    throw error
  }

  const team = TEAM_LIST.find((t) => t.id === input.teamId)
  const posLabel =
    POSITION_OPTIONS.find((p) => p.value === input.position)?.label ?? input.position
  await pushRegistrationToSheet({
    kind: 'athlete',
    sport: input.sport,
    sportLabel: input.sport === 'football' ? 'ฟุตซอล' : 'วอลเลย์บอล',
    teamId: input.teamId,
    teamName: team?.nameTh ?? input.teamId,
    fullName: input.fullName.trim(),
    position: input.position,
    positionLabel: posLabel,
    age: input.age,
    jerseyNumber: jersey ?? '',
    photoUrl: input.photoUrl || '',
  })
}

export function teamsForSelect(sport?: SportType) {
  if (sport === 'volleyball') {
    // บาเระใต้ถอนตัววอลเลย์
    return TEAM_LIST.filter((t) => t.id !== 'barehtai')
  }
  return TEAM_LIST
}

/** รายการ อปท. เดียวกับชีต (ทั้งนักกีฬาและผู้เข้าร่วม) */
export function orgOptionsForSelect() {
  return TEAM_LIST
}

export type AttendeeInput = {
  teamId: string
  fullName: string
  phone: string
  position: AttendeePosition
  /** เมื่อเลือก อื่นๆ — เช่น ผู้ใหญ่บ้าน */
  positionOther?: string
  /** ตำบลที่สังกัด — ไม่บังคับ (ชีตคอลัมน์ F) */
  subdistrict?: string
  note?: string
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '').trim()
}

export function validateAttendeePhone(phone: string): string | null {
  const p = normalizePhone(phone)
  if (!p) return 'กรุณากรอกเบอร์โทร'
  const digits = p.replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 10) {
    return 'กรุณากรอกเบอร์โทรให้ถูกต้อง'
  }
  return null
}

export function resolveAttendeePositionLabel(
  position: AttendeePosition,
  positionOther?: string,
): string {
  if (position === 'other') {
    return (positionOther || '').trim()
  }
  return ATTENDEE_POSITION_OPTIONS.find((p) => p.value === position)?.label ?? ''
}

export async function submitAttendeeRegistration(input: AttendeeInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('ยังไม่ได้เชื่อมฐานข้อมูล')
  }

  assertRegistrationOpen()

  const team = TEAM_LIST.find((t) => t.id === input.teamId)
  if (!team) throw new Error('กรุณาเลือก อปท.')

  const fullName = input.fullName.trim()
  const phone = normalizePhone(input.phone)
  const positionLabel = resolveAttendeePositionLabel(input.position, input.positionOther)
  const orgName = team.orgTh || team.nameTh
  const note = input.note?.trim() || null

  if (fullName.length < 2) throw new Error('กรุณากรอกชื่อ-สกุล')
  const phoneErr = validateAttendeePhone(phone)
  if (phoneErr) throw new Error(phoneErr)
  if (!positionLabel) {
    throw new Error(
      input.position === 'other' ? 'กรุณากรอกตำแหน่ง (เช่น ผู้ใหญ่บ้าน)' : 'กรุณาเลือกตำแหน่ง',
    )
  }

  const attendeeRow = {
    team_id: team.id,
    full_name: fullName,
    phone,
    position_label: positionLabel,
    subdistrict: input.subdistrict?.trim() || orgName,
    note,
  }

  let { error } = await supabase.from('event_attendees').insert(attendeeRow)

  // รองรับฐานข้อมูลช่วงเปลี่ยนผ่านก่อน migration เพิ่ม team_id ถูกนำขึ้นครบ
  if (error?.code === '42703' && error.message?.includes('team_id')) {
    const { team_id: _teamId, ...legacyAttendeeRow } = attendeeRow
    const legacyInsert = await supabase.from('event_attendees').insert(legacyAttendeeRow)
    error = legacyInsert.error
  }

  if (error) {
    throw new Error(error.message || 'ลงทะเบียนไม่สำเร็จ')
  }

  await pushRegistrationToSheet({
    kind: 'attendee',
    teamId: team.id,
    teamName: orgName,
    fullName,
    phone,
    positionLabel,
    subdistrict: input.subdistrict?.trim() || orgName,
    note: note ?? '',
  })
}

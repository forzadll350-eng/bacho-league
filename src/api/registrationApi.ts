import { TEAM_LIST } from '../data/teams'
import {
  FOOTBALL_RULES_VERSION,
  PRIVACY_NOTICE_VERSION,
} from '../data/registrationLegal'
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

/** ปิดรับลงทะเบียนนักกีฬา/ผู้เข้าร่วม หลัง 19 ก.ย. 2569 เวลา 17:00 (เวลาไทย) */
export const REGISTRATION_DEADLINE = new Date('2026-09-19T17:00:00+07:00')

export const REGISTRATION_CLOSED_MESSAGE =
  'หมดเวลาลงทะเบียนแล้ว ระบบรับถึงวันที่ 19 ก.ย. 2569 เวลา 17:00 น. เท่านั้น'

/** เปิดรับผู้เข้าร่วมหน้างานตั้งแต่ 21 ก.ย. 2569 เวลา 08:00 (เวลาไทย) */
export const ATTENDEE_REGISTRATION_OPENS_AT = new Date('2026-09-21T08:00:00+07:00')

export const ATTENDEE_REGISTRATION_WAIT_MESSAGE =
  'ระบบจะเปิดรับลงทะเบียนผู้เข้าร่วมวันที่ 21 ก.ย. 2569 ตั้งแต่เวลา 08:00 น.'

export function isRegistrationOpen(now: Date = new Date()): boolean {
  return now.getTime() <= REGISTRATION_DEADLINE.getTime()
}

export function assertRegistrationOpen(now: Date = new Date()): void {
  if (!isRegistrationOpen(now)) {
    throw new Error(REGISTRATION_CLOSED_MESSAGE)
  }
}

export function isAttendeeRegistrationOpen(now: Date = new Date()): boolean {
  return now.getTime() >= ATTENDEE_REGISTRATION_OPENS_AT.getTime()
}

export function assertAttendeeRegistrationOpen(now: Date = new Date()): void {
  if (!isAttendeeRegistrationOpen(now)) {
    throw new Error(ATTENDEE_REGISTRATION_WAIT_MESSAGE)
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
    .from('public_players')
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
    .from('public_players')
    .select('full_name, jersey_number')
    .eq('sport', 'football')
    .eq('team_id', teamId)
  if (error) throw error

  const hit = (data ?? []).find((r) => normalizeJersey(r.jersey_number ?? '') === want)
  return hit?.full_name ?? null
}

export type UploadedPlayerPhoto = { publicUrl: string; path: string }

export async function uploadPlayerPhoto(file: File, teamId: string): Promise<UploadedPlayerPhoto> {
  if (!supabase) throw new Error('ยังไม่ได้เชื่อม Supabase')
  if (file.size > 2 * 1024 * 1024) throw new Error('รูปต้องไม่เกิน 2 MB')

  const extByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  const ext = extByMime[file.type]
  if (!ext) throw new Error('รองรับเฉพาะรูป JPG, PNG หรือ WebP')
  const path = `${teamId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('player-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error

  const { data } = supabase.storage.from('player-photos').getPublicUrl(path)
  return { publicUrl: data.publicUrl, path }
}

export async function discardUnregisteredPlayerPhoto(path: string): Promise<void> {
  if (!supabase) return
  await supabase.rpc('discard_unregistered_player_photo', { p_path: path })
}

export type RegistrationInput = {
  sport: SportType
  teamId: string
  fullName: string
  position: PlayerPosition
  age: number
  jerseyNumber?: string
  photoUrl?: string
  rulesAccepted: boolean
  privacyAcknowledged: boolean
  publicRosterConsent: boolean
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
  }

  const { data: registrationId, error } = await supabase.rpc('submit_player_registration', {
    p_sport: input.sport,
    p_team_id: input.teamId,
    p_full_name: input.fullName.trim(),
    p_position: input.position,
    p_age: input.age,
    p_jersey_number: jersey,
    p_photo_url: input.photoUrl || null,
    p_rules_accepted: input.rulesAccepted,
    p_rules_version: input.sport === 'football' ? FOOTBALL_RULES_VERSION : null,
    p_privacy_acknowledged: input.privacyAcknowledged,
    p_privacy_notice_version: PRIVACY_NOTICE_VERSION,
    p_public_roster_consent: input.publicRosterConsent,
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
    if (error.message?.includes('deadline has passed')) {
      throw new Error(REGISTRATION_CLOSED_MESSAGE)
    }
    if (error.message?.includes('privacy acknowledgement is required')) {
      throw new Error('กรุณาอ่านและรับทราบประกาศความเป็นส่วนตัว')
    }
    if (error.message?.includes('public roster consent is required')) {
      throw new Error('กรุณายินยอมให้แสดงรายชื่อในหน้ารายชื่อนักกีฬาสาธารณะ')
    }
    if (error.message?.includes('football rules acceptance is required')) {
      throw new Error('กรุณาอ่านและยอมรับระเบียบการแข่งขันฟุตซอล')
    }
    if (error.message?.includes('check') || error.code === '42501') {
      throw new Error('ลงทะเบียนไม่สำเร็จ กรุณาตรวจสอบข้อมูลอีกครั้ง')
    }
    throw error
  }
  if (typeof registrationId !== 'string') throw new Error('ไม่ได้รับรหัสยืนยันการลงทะเบียน')

  const team = TEAM_LIST.find((t) => t.id === input.teamId)
  const posLabel =
    POSITION_OPTIONS.find((p) => p.value === input.position)?.label ?? input.position
  await pushRegistrationToSheet({
    kind: 'athlete',
    recordId: registrationId,
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

export type PublicRosterPlayer = {
  id: string
  sport: SportType
  teamId: string
  fullName: string
  jerseyNumber?: string
}

export async function loadPublicPlayerRoster(sport: SportType): Promise<PublicRosterPlayer[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('public_player_roster')
    .select('id, sport, team_id, full_name, jersey_number')
    .eq('sport', sport)
    .order('full_name', { ascending: true })

  if (error) throw new Error('โหลดรายชื่อนักกีฬาไม่สำเร็จ กรุณาลองใหม่')

  return (data ?? []).map((row) => ({
    id: row.id,
    sport: row.sport as SportType,
    teamId: row.team_id,
    fullName: row.full_name,
    jerseyNumber: row.jersey_number ?? undefined,
  }))
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

  assertAttendeeRegistrationOpen()

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

  const subdistrict = input.subdistrict?.trim() || orgName
  const { data: attendeeId, error } = await supabase.rpc('submit_event_attendee', {
    p_team_id: team.id,
    p_full_name: fullName,
    p_phone: phone,
    p_position_label: positionLabel,
    p_subdistrict: subdistrict,
    p_note: note,
  })

  if (error) {
    if (error.message?.includes('attendee registration is not open yet')) {
      throw new Error(ATTENDEE_REGISTRATION_WAIT_MESSAGE)
    }
    throw new Error(error.message || 'ลงทะเบียนไม่สำเร็จ')
  }
  if (typeof attendeeId !== 'string') throw new Error('ไม่ได้รับรหัสยืนยันการลงทะเบียน')

  await pushRegistrationToSheet({
    kind: 'attendee',
    recordId: attendeeId,
    teamId: team.id,
    teamName: orgName,
    fullName,
    phone,
    positionLabel,
    subdistrict,
    note: note ?? '',
  })
}

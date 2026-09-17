import { isSupabaseConfigured, supabase } from '../lib/supabase'

export const EVALUATION_OPENS_AT = new Date('2026-09-21T08:00:00+07:00')
export const EVALUATION_OPENS_LABEL = '21 ก.ย. 2569 เวลา 08:00 น.'

const DEVICE_KEY = 'bacho-evaluation-device-v1'
const SUBMITTED_KEY = 'bacho-evaluation-submitted-v1'

export const RESPONDENT_TYPES = [
  { value: 'athlete', label: 'นักกีฬา' },
  { value: 'attendee', label: 'ผู้เข้าร่วม / พนักงาน' },
  { value: 'organizer', label: 'คณะผู้จัดงาน' },
  { value: 'spectator', label: 'ผู้ชมการแข่งขัน' },
  { value: 'other', label: 'อื่น ๆ' },
] as const

export type RespondentType = (typeof RESPONDENT_TYPES)[number]['value']

export const EVALUATION_QUESTIONS = [
  { key: 'publicity', label: 'การประชาสัมพันธ์โครงการ' },
  { key: 'registration', label: 'ขั้นตอนการลงทะเบียน' },
  { key: 'schedule', label: 'ตารางและลำดับการแข่งขัน' },
  { key: 'venue', label: 'สถานที่และความพร้อมของสนาม' },
  { key: 'officiating', label: 'การปฏิบัติหน้าที่ของกรรมการ' },
  { key: 'liveScore', label: 'ระบบรายงานผลและคะแนนสด' },
  { key: 'organization', label: 'การดำเนินงานของผู้จัด' },
  { key: 'overall', label: 'ความพึงพอใจโดยรวม' },
] as const

export type EvaluationQuestionKey = (typeof EVALUATION_QUESTIONS)[number]['key']
export type EvaluationScores = Record<EvaluationQuestionKey, number>

export type EvaluationStatus = {
  opensAt: string
  isOpen: boolean
  manuallyClosed: boolean
}

export type EvaluationInput = {
  teamId: string
  respondentType: RespondentType
  scores: EvaluationScores
  joinAgain: boolean
  comment: string
}

function readOrCreateDeviceToken(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(DEVICE_KEY, created)
    return created
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

async function getDeviceHash(): Promise<string> {
  const raw = `bacho-evaluation-v1:${readOrCreateDeviceToken()}`
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  return Array.from(raw)
    .map((character) => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64)
}

export function hasSubmittedEvaluationLocally(): boolean {
  try {
    return localStorage.getItem(SUBMITTED_KEY) === 'yes'
  } catch {
    return false
  }
}

function markEvaluationSubmitted() {
  try {
    localStorage.setItem(SUBMITTED_KEY, 'yes')
  } catch {
    /* The database uniqueness check remains the source of truth. */
  }
}

export async function loadEvaluationStatus(): Promise<EvaluationStatus> {
  if (!isSupabaseConfigured || !supabase) {
    const nowOpen = Date.now() >= EVALUATION_OPENS_AT.getTime()
    return {
      opensAt: EVALUATION_OPENS_AT.toISOString(),
      isOpen: nowOpen,
      manuallyClosed: false,
    }
  }

  const { data, error } = await supabase.rpc('get_evaluation_status')
  if (error) throw new Error('ตรวจสอบสถานะแบบประเมินไม่สำเร็จ กรุณาลองใหม่')
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('ไม่พบการตั้งค่าระบบประเมิน')
  return {
    opensAt: row.opens_at,
    isOpen: Boolean(row.is_open),
    manuallyClosed: Boolean(row.manually_closed),
  }
}

export async function submitEvaluation(input: EvaluationInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล')
  const deviceHash = await getDeviceHash()
  const { error } = await supabase.rpc('submit_satisfaction_evaluation', {
    p_team_id: input.teamId,
    p_respondent_type: input.respondentType,
    p_publicity_score: input.scores.publicity,
    p_registration_score: input.scores.registration,
    p_schedule_score: input.scores.schedule,
    p_venue_score: input.scores.venue,
    p_officiating_score: input.scores.officiating,
    p_live_score_score: input.scores.liveScore,
    p_organization_score: input.scores.organization,
    p_overall_score: input.scores.overall,
    p_join_again: input.joinAgain,
    p_comment: input.comment,
    p_device_hash: deviceHash,
  })

  if (error) {
    if (error.code === '23505') throw new Error('อุปกรณ์นี้ส่งแบบประเมินแล้ว')
    if (error.message?.includes('evaluation is closed') || error.code === '42501') {
      throw new Error('ระบบประเมินยังไม่เปิดหรือถูกปิดรับแล้ว')
    }
    if (error.message?.includes('comment')) throw new Error('ข้อเสนอแนะยาวเกิน 1,000 ตัวอักษร')
    throw new Error('ส่งแบบประเมินไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่')
  }

  markEvaluationSubmitted()
}

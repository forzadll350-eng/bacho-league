import { supabase } from '../lib/supabase'

export const EVALUATION_OPENS_LABEL = '21 ก.ย. 2569 เวลา 08:00 น.'

export const EVALUATION_QUESTIONS = [
  { key: 'publicity_score', label: 'การประชาสัมพันธ์โครงการ' },
  { key: 'registration_score', label: 'ขั้นตอนการลงทะเบียน' },
  { key: 'schedule_score', label: 'ตารางและลำดับการแข่งขัน' },
  { key: 'venue_score', label: 'สถานที่และความพร้อมของสนาม' },
  { key: 'officiating_score', label: 'การปฏิบัติหน้าที่ของกรรมการ' },
  { key: 'live_score_score', label: 'ระบบรายงานผลและคะแนนสด' },
  { key: 'organization_score', label: 'การดำเนินงานของผู้จัด' },
  { key: 'overall_score', label: 'ความพึงพอใจโดยรวม' },
] as const

export type EvaluationScoreKey = (typeof EVALUATION_QUESTIONS)[number]['key']

export const RESPONDENT_LABELS: Record<string, string> = {
  athlete: 'นักกีฬา',
  attendee: 'ผู้เข้าร่วม / พนักงาน',
  organizer: 'คณะผู้จัดงาน',
  spectator: 'ผู้ชมการแข่งขัน',
  other: 'อื่น ๆ',
}

export type EvaluationResponse = {
  id: string
  team_id: string
  respondent_type: string
  publicity_score: number
  registration_score: number
  schedule_score: number
  venue_score: number
  officiating_score: number
  live_score_score: number
  organization_score: number
  overall_score: number
  join_again: boolean
  comment: string | null
  created_at: string
  team: {
    name_th: string
    short_name: string
  } | null
}

export type EvaluationSettings = {
  opens_at: string
  manually_closed: boolean
  closed_at: string | null
  updated_at: string
}

export async function fetchEvaluationDashboard(): Promise<{
  responses: EvaluationResponse[]
  settings: EvaluationSettings
}> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')

  const [responsesResult, settingsResult] = await Promise.all([
    supabase
      .from('evaluation_responses')
      .select(`
        id, team_id, respondent_type,
        publicity_score, registration_score, schedule_score, venue_score,
        officiating_score, live_score_score, organization_score, overall_score,
        join_again, comment, created_at,
        team:teams!team_id(name_th, short_name)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('evaluation_settings')
      .select('opens_at, manually_closed, closed_at, updated_at')
      .eq('id', true)
      .single(),
  ])

  if (responsesResult.error) throw new Error(responsesResult.error.message)
  if (settingsResult.error) throw new Error(settingsResult.error.message)

  return {
    responses: (responsesResult.data ?? []) as unknown as EvaluationResponse[],
    settings: settingsResult.data as EvaluationSettings,
  }
}

export async function setEvaluationClosed(closed: boolean): Promise<EvaluationSettings> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase
    .from('evaluation_settings')
    .update({
      manually_closed: closed,
      closed_at: closed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true)
    .select('opens_at, manually_closed, closed_at, updated_at')
    .single()

  if (error) throw new Error(error.message)
  return data as EvaluationSettings
}

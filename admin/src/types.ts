export type SportType = 'football' | 'volleyball'

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'

export type ThemeMode = 'dark' | 'light'

export type StatusFilter = 'all' | 'live' | 'finished' | 'scheduled'

export interface TeamRow {
  id: string
  name_th: string
  name_en: string | null
  short_name: string
}

export interface MatchRow {
  id: string
  sport: SportType
  status: MatchStatus
  home_score: number
  away_score: number
  live_clock: string | null
  period_label: string | null
  live_stream_url: string | null
  updated_at: string
  scheduled_at: string
  venue: string | null
  home_team_id: string
  away_team_id: string
  home: TeamRow | null
  away: TeamRow | null
}

export interface MatchUpdate {
  status: MatchStatus
  home_score: number
  away_score: number
  live_clock: string | null
  period_label: string | null
  live_stream_url: string | null
  updated_at: string
}

export const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'กำหนดการ',
  live: 'ถ่ายทอดสด',
  halftime: 'พักครึ่ง',
  finished: 'จบแล้ว',
  postponed: 'เลื่อน',
  cancelled: 'ยกเลิก',
}

export const SPORT_LABELS: Record<SportType, string> = {
  football: 'ฟุตบอล',
  volleyball: 'วอลเลย์บอล',
}

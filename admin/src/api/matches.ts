import { supabase } from '../lib/supabase'
import type { MatchRow, MatchUpdate, SportType, TeamRow } from '../types'

const MATCH_SELECT =
  'id, sport, status, home_score, away_score, home_points, away_points, points_set, set_scores, live_clock, period_label, group_code, stage, court_label, updated_at, scheduled_at, started_at, ends_at, venue, hide_schedule_time, match_order, home_team_id, away_team_id, home:teams!home_team_id(id, name_th, name_en, short_name), away:teams!away_team_id(id, name_th, name_en, short_name)'

type RawTeam = TeamRow | TeamRow[] | null

type RawMatch = Omit<MatchRow, 'home' | 'away'> & {
  home: RawTeam
  away: RawTeam
}

export type GoalRow = {
  id: string
  match_id: string
  team_id: string
  jersey_number: string
  minute_approx: number | null
  registration_id: string | null
  player_name: string | null
}

export type GoalDraft = {
  id?: string
  team_id: string
  jersey_number: string
  minute_approx: number | null
  registration_id: string | null
  player_name: string | null
}

export type VolleyballPointsUpdate = {
  homePoints: number
  awayPoints: number
  pointsSet: number
  setScores: Partial<Record<'1' | '2' | '3', { home: number; away: number }>>
}

export type GroupStandingRow = {
  team_id: string
  group_code: 'A' | 'B'
  rank: number
  played: number
  won: number | null
  drawn: number | null
  lost: number | null
  points: number
  sets_won: number | null
  sets_lost: number | null
  team: TeamRow | null
}

type RawStanding = Omit<GroupStandingRow, 'team' | 'group_code'> & {
  group_code: string | null
  team: RawTeam
}

function oneTeam(value: RawTeam): TeamRow | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapMatch(row: RawMatch): MatchRow {
  return {
    ...row,
    home: oneTeam(row.home),
    away: oneTeam(row.away),
  }
}

export async function fetchMatches(sport: SportType): Promise<MatchRow[]> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')

  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('sport', sport)
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return ((data ?? []) as RawMatch[]).map(mapMatch)
}

export async function fetchMatch(id: string): Promise<MatchRow> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')

  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return mapMatch(data as RawMatch)
}

export async function fetchMatchGoals(matchId: string): Promise<GoalRow[]> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase
    .from('match_goals')
    .select('id, match_id, team_id, jersey_number, minute_approx, registration_id, player_name')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as GoalRow[]
}

export async function saveMatchState(
  matchId: string,
  patch: MatchUpdate,
  goals: GoalDraft[] | null,
): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const goalPayload =
    goals?.map((g) => ({
      team_id: g.team_id,
      jersey_number: g.jersey_number.trim(),
      minute_approx: g.minute_approx,
      registration_id: g.registration_id,
      player_name: g.player_name,
    })) ?? null
  const { error } = await supabase.rpc('save_match_state', {
    p_match_id: matchId,
    p_patch: patch,
    p_goals: goalPayload,
  })
  if (error) throw error
}

export async function fetchGroupStandings(sport: SportType): Promise<GroupStandingRow[]> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase
    .from('standings')
    .select('team_id, group_code, rank, played, won, drawn, lost, points, sets_won, sets_lost, team:teams!team_id(id, name_th, name_en, short_name)')
    .eq('sport', sport)
    .eq('season_id', sport === 'football' ? 'season-2569-fb' : 'season-2569-vb')
    .order('rank', { ascending: true })
  if (error) throw error
  return ((data ?? []) as RawStanding[])
    .filter((row) => row.group_code === 'A' || row.group_code === 'B')
    .map((row) => ({
      ...row,
      group_code: row.group_code as 'A' | 'B',
      team: oneTeam(row.team),
    }))
}

const KNOCKOUT_LABELS: Record<string, string> = {
  'fb-sf-1': 'รอบรองชนะเลิศ 1',
  'fb-sf-2': 'รอบรองชนะเลิศ 2',
  'fb-third': 'ชิงอันดับ 3',
  'fb-final': 'ชิงชนะเลิศ',
  'vb-final': 'ชิงชนะเลิศ',
}

type KnockoutSlot = { id: string; label: string }

export const KNOCKOUT_DEFAULTS: Record<string, {
  home: KnockoutSlot
  away: KnockoutSlot
  periodLabel: string
}> = {
  'fb-sf-1': {
    home: { id: 'slot-a1', label: 'ที่ 1 สาย A' },
    away: { id: 'slot-b2', label: 'ที่ 2 สาย B' },
    periodLabel: 'รองชนะเลิศ 1 · A1 พบ B2',
  },
  'fb-sf-2': {
    home: { id: 'slot-b1', label: 'ที่ 1 สาย B' },
    away: { id: 'slot-a2', label: 'ที่ 2 สาย A' },
    periodLabel: 'รองชนะเลิศ 2 · B1 พบ A2',
  },
  'fb-third': {
    home: { id: 'slot-sf1-loser', label: 'ผู้แพ้รองฯ 1' },
    away: { id: 'slot-sf2-loser', label: 'ผู้แพ้รองฯ 2' },
    periodLabel: 'ชิงอันดับ 3 · ผู้แพ้รองฯ พบกัน',
  },
  'fb-final': {
    home: { id: 'slot-sf1', label: 'ผู้ชนะรองฯ 1' },
    away: { id: 'slot-sf2', label: 'ผู้ชนะรองฯ 2' },
    periodLabel: 'ชิงชนะเลิศ · ผู้ชนะรองฯ พบกัน',
  },
  'vb-final': {
    home: { id: 'slot-a1', label: 'ที่ 1 สาย A' },
    away: { id: 'slot-b1', label: 'ที่ 1 สาย B' },
    periodLabel: 'ชิงชนะเลิศ · ที่ 1 สาย A พบ ที่ 1 สาย B',
  },
}

/** Admins choose knockout participants; played match results remain protected. */
export async function assignKnockoutTeams(
  matchId: string,
  sport: SportType,
  homeTeamId: string,
  awayTeamId: string,
  expectedUpdatedAt: string,
): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const defaults = KNOCKOUT_DEFAULTS[matchId]
  if (!Object.hasOwn(KNOCKOUT_DEFAULTS, matchId) || !defaults) {
    throw new Error('คู่นี้ไม่ใช่รอบน็อกเอาต์')
  }
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    throw new Error('เลือกทีมทั้งสองฝั่งที่ไม่ซ้ำกัน')
  }

  const [matches, standings] = await Promise.all([
    fetchMatches(sport),
    fetchGroupStandings(sport),
  ])
  const target = matches.find((row) => row.id === matchId)
  if (!target || target.updated_at !== expectedUpdatedAt) {
    throw new Error('ข้อมูลคู่แข่งขันเปลี่ยนไปแล้ว กรุณาโหลดใหม่')
  }
  if (target.status !== 'scheduled' || target.home_score !== 0 || target.away_score !== 0 ||
      (target.home_points ?? 0) !== 0 || (target.away_points ?? 0) !== 0) {
    throw new Error('เปลี่ยนทีมได้เฉพาะคู่ที่ยังไม่เริ่มและยังไม่มีคะแนน')
  }
  const eligible = new Set(standings.map((row) => row.team_id))
  if ((!eligible.has(homeTeamId) && homeTeamId !== defaults.home.id) ||
      (!eligible.has(awayTeamId) && awayTeamId !== defaults.away.id)) {
    throw new Error('เลือกทีมในรายการหรือช่องรอผลเดิมของคู่นี้')
  }

  if (sport === 'football') {
    const { data: goals, error: goalsError } = await supabase
      .from('match_goals')
      .select('id')
      .eq('match_id', matchId)
      .limit(1)
    if (goalsError) throw goalsError
    if (goals?.length) throw new Error('คู่นี้มีรายการผู้ยิงอยู่ กรุณาลบรายการเดิมก่อนเปลี่ยนทีม')
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      period_label: homeTeamId === defaults.home.id && awayTeamId === defaults.away.id
        ? defaults.periodLabel
        : KNOCKOUT_LABELS[matchId],
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .eq('sport', sport)
    .eq('status', 'scheduled')
    .eq('home_score', 0)
    .eq('away_score', 0)
    .eq('updated_at', expectedUpdatedAt)
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('คู่แข่งขันถูกแก้ไขระหว่างบันทึก กรุณาโหลดใหม่')
}

/** Persist only volleyball rally points; every other editor field remains unsaved. */
export async function saveVolleyballPoints(
  matchId: string,
  points: VolleyballPointsUpdate,
): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { error } = await supabase.rpc('save_volleyball_points', {
    p_match_id: matchId,
    p_home_points: points.homePoints,
    p_away_points: points.awayPoints,
    p_points_set: points.pointsSet,
    p_set_scores: points.setScores,
  })
  if (error) throw error
}

export async function fetchLeadPoints(sport: SportType): Promise<number | null> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')

  const { data, error } = await supabase
    .from('standings')
    .select('points')
    .eq('sport', sport)
    .order('rank', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.points ?? null
}

export function teamName(team: MatchRow['home']): string {
  if (!team) return '—'
  return team.name_th || team.short_name
}

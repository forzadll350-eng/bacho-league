import { supabase } from '../lib/supabase'
import type { MatchRow, MatchUpdate, SportType, TeamRow } from '../types'

const MATCH_SELECT =
  'id, sport, status, home_score, away_score, home_points, away_points, points_set, set_scores, live_clock, period_label, live_stream_url, group_code, stage, court_label, updated_at, scheduled_at, ends_at, venue, hide_schedule_time, home_team_id, away_team_id, home:teams!home_team_id(id, name_th, name_en, short_name), away:teams!away_team_id(id, name_th, name_en, short_name)'

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

export async function updateMatch(id: string, patch: MatchUpdate): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')

  const { error } = await supabase.from('matches').update(patch).eq('id', id)
  if (error) throw error
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

export async function replaceMatchGoals(matchId: string, goals: GoalDraft[]): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { error: delError } = await supabase.from('match_goals').delete().eq('match_id', matchId)
  if (delError) throw delError
  if (!goals.length) return
  const { error } = await supabase.from('match_goals').insert(
    goals.map((g) => ({
      match_id: matchId,
      team_id: g.team_id,
      jersey_number: g.jersey_number.trim(),
      minute_approx: g.minute_approx,
      registration_id: g.registration_id,
      player_name: g.player_name,
    })),
  )
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

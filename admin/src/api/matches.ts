import { supabase } from '../lib/supabase'
import type { MatchRow, MatchUpdate, SportType, TeamRow } from '../types'

const MATCH_SELECT =
  'id, sport, status, home_score, away_score, live_clock, period_label, updated_at, scheduled_at, venue, home_team_id, away_team_id, home:teams!home_team_id(id, name_th, name_en, short_name), away:teams!away_team_id(id, name_th, name_en, short_name)'

type RawTeam = TeamRow | TeamRow[] | null

type RawMatch = Omit<MatchRow, 'home' | 'away'> & {
  home: RawTeam
  away: RawTeam
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
  return team.short_name || team.name_th
}

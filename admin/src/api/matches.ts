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

const KNOCKOUT_GROUP_SIDES: Record<string, readonly ['A' | 'B', 'A' | 'B'] | null> = {
  'fb-sf-1': ['A', 'B'],
  'fb-sf-2': ['B', 'A'],
  'fb-third': null,
  'fb-final': null,
  'vb-final': ['A', 'B'],
}

/** A draw may be decided by penalties, so admins choose the advancing team. */
export function eligiblePlayoffTeams(matchId: string, matches: MatchRow[]): Set<string> {
  const eligible = new Set<string>()
  if (matchId !== 'fb-final' && matchId !== 'fb-third') return eligible
  for (const semiId of ['fb-sf-1', 'fb-sf-2']) {
    const semi = matches.find((row) => row.id === semiId)
    if (!semi || semi.status !== 'finished') continue
    if (semi.home_score === semi.away_score) {
      eligible.add(semi.home_team_id)
      eligible.add(semi.away_team_id)
    } else {
      const homeAdvances = semi.home_score > semi.away_score
      eligible.add(matchId === 'fb-final'
        ? (homeAdvances ? semi.home_team_id : semi.away_team_id)
        : (homeAdvances ? semi.away_team_id : semi.home_team_id))
    }
  }
  return eligible
}

/** Replace placeholder participants only before kickoff; keep the existing match ID. */
export async function assignKnockoutTeams(
  matchId: string,
  sport: SportType,
  homeTeamId: string,
  awayTeamId: string,
  expectedUpdatedAt: string,
): Promise<void> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  if (!(matchId in KNOCKOUT_GROUP_SIDES)) throw new Error('คู่นี้ไม่ใช่รอบน็อกเอาต์')
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    throw new Error('เลือกทีมจริงสองทีมที่ไม่ซ้ำกัน')
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
  const groupMatches = matches.filter((row) => row.stage === 'group' &&
    (row.group_code === 'A' || row.group_code === 'B'))
  if (!groupMatches.length || groupMatches.some((row) => row.status !== 'finished')) {
    throw new Error('ต้องจบรอบแบ่งสายทุกคู่ก่อนจัดทีมรอบน็อกเอาต์')
  }

  const semis = matches.filter((row) => row.id === 'fb-sf-1' || row.id === 'fb-sf-2')
  if (matchId === 'fb-final' || matchId === 'fb-third') {
    if (semis.length !== 2 || semis.some((row) => row.status !== 'finished')) {
      throw new Error('ต้องจบรอบรองทั้งสองคู่ก่อนเลือกทีมรอบชิง')
    }
    const eligible = eligiblePlayoffTeams(matchId, matches)
    if (!eligible.has(homeTeamId) || !eligible.has(awayTeamId)) {
      throw new Error('เลือกทีมตามผู้ชนะ/ผู้แพ้รอบรอง ถ้าเสมอให้เลือกตามผลจุดโทษ')
    }
    const firstSemi = semis.find((row) => row.id === 'fb-sf-1')!
    const secondSemi = semis.find((row) => row.id === 'fb-sf-2')!
    const fromFirst = [firstSemi.home_team_id, firstSemi.away_team_id]
    const fromSecond = [secondSemi.home_team_id, secondSemi.away_team_id]
    if (!((fromFirst.includes(homeTeamId) && fromSecond.includes(awayTeamId)) ||
          (fromSecond.includes(homeTeamId) && fromFirst.includes(awayTeamId)))) {
      throw new Error('คู่รอบชิงต้องมีทีมจากรอบรองคู่ละหนึ่งทีม')
    }
    const otherId = matchId === 'fb-final' ? 'fb-third' : 'fb-final'
    const other = matches.find((row) => row.id === otherId)
    if (other && [other.home_team_id, other.away_team_id].some(
      (id) => !id.startsWith('slot-') && (id === homeTeamId || id === awayTeamId),
    )) {
      throw new Error('ทีมนี้ถูกเลือกในอีกคู่รอบชิง/ชิงอันดับ 3 แล้ว')
    }
  } else {
    const requiredGroups = KNOCKOUT_GROUP_SIDES[matchId]
    if (!requiredGroups ||
        standings.find((row) => row.team_id === homeTeamId)?.group_code !== requiredGroups[0] ||
        standings.find((row) => row.team_id === awayTeamId)?.group_code !== requiredGroups[1]) {
      throw new Error('เลือกทีมให้ตรงสายที่ระบุในผังการแข่งขัน')
    }
    if (target.stage === 'semi') {
      const otherSemi = semis.find((row) => row.id !== matchId)
      if (otherSemi && [otherSemi.home_team_id, otherSemi.away_team_id].some(
        (id) => id === homeTeamId || id === awayTeamId,
      )) {
        throw new Error('ทีมนี้ถูกเลือกในอีกรอบรองแล้ว')
      }
      if (matches.some((row) => (row.id === 'fb-final' || row.id === 'fb-third') &&
          [row.home_team_id, row.away_team_id].some((id) => !id.startsWith('slot-')))) {
        throw new Error('จัดทีมรอบชิงแล้ว จึงเปลี่ยนคู่รอบรองไม่ได้')
      }
    }
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

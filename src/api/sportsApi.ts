import type {
  AppNotification,
  Match,
  MatchStatus,
  SportBundle,
  SportType,
  StandingRow,
  Team,
} from '../types/sports'
import { MOCK } from '../data/mock'
import { TEAMS } from '../data/teams'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type DbTeam = {
  id: string
  name_th: string
  name_en: string | null
  short_name: string
  crest_url: string | null
  org_th: string | null
}

type DbMatch = {
  id: string
  sport: SportType
  competition_id: string
  season_id: string
  home_team_id: string
  away_team_id: string
  scheduled_at: string
  venue: string | null
  status: MatchStatus
  home_score: number
  away_score: number
  live_clock: string | null
  period_label: string | null
  detail: boolean
  live_stream_url: string | null
}

type DbStanding = {
  rank: number
  previous_rank: number | null
  team_id: string
  played: number
  won: number | null
  drawn: number | null
  lost: number | null
  points: number
  sets_won: number | null
  sets_lost: number | null
}

type DbNotification = {
  id: string
  sport: SportType
  icon: string
  title: string
  body: string
  time_label: string
}

function mapTeam(row: DbTeam): Team {
  return {
    id: row.id,
    nameTh: row.name_th,
    nameEn: row.name_en ?? row.name_th,
    shortName: row.short_name,
    crestUrl: (row.crest_url ?? `/crests/${row.id}.webp`).replace(/\.png$/i, '.webp'),
    orgTh: row.org_th ?? row.name_th,
  }
}

function teamById(map: Map<string, Team>, id: string): Team {
  const fromMap = map.get(id)
  if (fromMap) return fromMap
  const fromLocal = Object.values(TEAMS).find((t) => t.id === id)
  if (fromLocal) return fromLocal
  return {
    id,
    nameTh: id,
    nameEn: id,
    shortName: id.slice(0, 2).toUpperCase(),
    crestUrl: '',
    orgTh: id,
  }
}

function mapMatch(row: DbMatch, teams: Map<string, Team>): Match {
  return {
    id: row.id,
    sport: row.sport,
    competitionId: row.competition_id,
    seasonId: row.season_id,
    homeTeam: teamById(teams, row.home_team_id),
    awayTeam: teamById(teams, row.away_team_id),
    scheduledAt: row.scheduled_at,
    venue: row.venue ?? undefined,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    liveClock: row.live_clock ?? undefined,
    periodLabel: row.period_label ?? undefined,
    detail: row.detail,
    liveStreamUrl: row.live_stream_url ?? undefined,
  }
}

function mapStanding(row: DbStanding, teams: Map<string, Team>): StandingRow {
  return {
    rank: row.rank,
    previousRank: row.previous_rank ?? undefined,
    team: teamById(teams, row.team_id),
    played: row.played,
    won: row.won ?? undefined,
    drawn: row.drawn ?? undefined,
    lost: row.lost ?? undefined,
    points: row.points,
    setsWon: row.sets_won ?? undefined,
    setsLost: row.sets_lost ?? undefined,
  }
}

function mapNotification(row: DbNotification): AppNotification {
  return {
    id: row.id,
    sport: row.sport,
    icon: row.icon,
    title: row.title,
    body: row.body,
    timeLabel: row.time_label,
  }
}

function liveMatch(matches: Match[]): Match | undefined {
  return matches.find((m) => m.status === 'live' || m.status === 'halftime') ?? matches[0]
}

function buildHero(sport: SportType, match: Match | undefined) {
  const base = MOCK[sport]
  if (!match) return base.hero

  return {
    ...base.hero,
    home: match.homeTeam,
    away: match.awayTeam,
    score: `${match.homeScore}–${match.awayScore}`,
    state: match.periodLabel ?? (match.status === 'live' ? 'กำลังแข่งขัน' : match.status),
    clock: match.liveClock ?? (sport === 'volleyball' ? 'SET' : 'LIVE'),
    league: base.hero.league,
    liveStreamUrl: match.liveStreamUrl,
  }
}

function mergeBundle(
  sport: SportType,
  matches: Match[],
  table: StandingRow[],
  notifications: AppNotification[],
): SportBundle {
  const base = MOCK[sport]
  const live = liveMatch(matches)
  const liveCount = matches.filter((m) => m.status === 'live' || m.status === 'halftime').length
  const done = matches.filter((m) => m.status === 'finished').length
  const scheduled = matches.filter((m) => m.status === 'scheduled').length
  const leadPts = table[0]?.points ?? 0

  return {
    ...base,
    homeSub: base.homeSub,
    liveSub: live
      ? `${live.homeTeam.nameTh} พบ ${live.awayTeam.nameTh}`
      : base.liveSub,
    hero: buildHero(sport, live),
    matches: matches.length ? matches : base.matches,
    table: table.length ? table : base.table,
    notifications: notifications.length ? notifications : base.notifications,
    quick: [
      [String(liveCount), 'กำลังแข่งขัน'],
      [String(done), 'จบแล้ว'],
      [String(scheduled), 'รอแข่งขัน'],
      [String(leadPts), 'คะแนนทีมนำ'],
    ],
  }
}

async function fetchFromSupabase(sport: SportType): Promise<SportBundle> {
  if (!supabase) throw new Error('Supabase not configured')

  const seasonId = sport === 'football' ? 'season-2569-fb' : 'season-2569-vb'

  const [teamsRes, matchesRes, standingsRes, notifRes] = await Promise.all([
    supabase.from('teams').select('*').order('sort_order'),
    supabase
      .from('matches')
      .select('*')
      .eq('sport', sport)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('standings')
      .select('*')
      .eq('sport', sport)
      .eq('season_id', seasonId)
      .order('rank', { ascending: true }),
    supabase.from('notifications').select('*').eq('sport', sport).order('created_at', {
      ascending: false,
    }),
  ])

  if (teamsRes.error) throw teamsRes.error
  if (matchesRes.error) throw matchesRes.error
  if (standingsRes.error) throw standingsRes.error
  if (notifRes.error) throw notifRes.error

  const teamMap = new Map((teamsRes.data as DbTeam[]).map((t) => [t.id, mapTeam(t)]))
  const matches = (matchesRes.data as DbMatch[]).map((m) => mapMatch(m, teamMap))
  const table = (standingsRes.data as DbStanding[]).map((s) => mapStanding(s, teamMap))
  const notifications = (notifRes.data as DbNotification[]).map(mapNotification)

  return mergeBundle(sport, matches, table, notifications)
}

export async function loadSportBundle(sport: SportType): Promise<SportBundle> {
  if (!isSupabaseConfigured) {
    return MOCK[sport]
  }
  try {
    return await fetchFromSupabase(sport)
  } catch (err) {
    console.warn('[sportsApi] Supabase fetch failed, using mock', err)
    return MOCK[sport]
  }
}

export function subscribeSportUpdates(
  sport: SportType,
  onChange: () => void,
): (() => void) | null {
  if (!supabase) return null

  const channel = supabase
    .channel(`sport-${sport}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `sport=eq.${sport}` },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'standings', filter: `sport=eq.${sport}` },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `sport=eq.${sport}` },
      () => onChange(),
    )
    .subscribe()

  return () => {
    void supabase!.removeChannel(channel)
  }
}

export { isSupabaseConfigured }

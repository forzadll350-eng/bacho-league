import type {
  AppNotification,
  LiveHeroData,
  Match,
  MatchGoal,
  MatchStatus,
  SportBundle,
  SportType,
  StandingRow,
  Team,
  TopScorer,
  VoteCandidate,
} from '../types/sports'
import { LEAGUE, SLOT_TEAMS, TEAMS } from '../data/teams'
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
  updated_at: string
  started_at: string | null
  ends_at: string | null
  venue: string | null
  status: MatchStatus
  home_score: number
  away_score: number
  home_points?: number | null
  away_points?: number | null
  points_set?: number | null
  set_scores?: Record<string, { home?: number; away?: number }> | null
  live_clock: string | null
  period_label: string | null
  detail: boolean
  group_code: string | null
  stage: string | null
  court_label: string | null
  hide_schedule_time?: boolean | null
  match_order?: number | null
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
  group_code: string | null
  lottery_note: string | null
}

type DbNotification = {
  id: string
  sport: SportType
  icon: string
  title: string
  body: string
  time_label: string
}

type DbGoal = {
  id: string
  match_id: string
  team_id: string
  jersey_number: string
  minute_approx: number | null
  registration_id: string | null
  player_name: string | null
}

type DbRegistration = {
  id: string
  sport: SportType
  team_id: string
  full_name: string
  jersey_number: string | null
  photo_url: string | null
}

type DbVote = {
  registration_id: string
  votes: number
}

function placeholderTeam(): Team {
  return {
    id: 'tbd',
    nameTh: 'รอคู่แข่ง',
    nameEn: 'TBD',
    shortName: '—',
    crestUrl: LEAGUE.crestUrl,
    orgTh: '—',
  }
}

export function emptyBundle(sport: SportType): SportBundle {
  const label = sport === 'football' ? 'ฟุตซอล' : 'วอลเลย์บอลหญิง'
  return {
    homeSub: `21 ก.ย. 2569 · ${label}`,
    liveSub: 'ยังไม่มีการแข่งขันสด',
    hero: {
      league: `${label} · สายใยสัมพันธ์ 2569`,
      home: placeholderTeam(),
      away: placeholderTeam(),
      score: '—',
      state: 'รอข้อมูลจากสนาม',
      clock: '—',
      stats: [],
    },
    matches: [],
    quick: [
      ['0', 'จบแล้ว'],
      ['0', 'รอแข่งขัน'],
      ['0', 'คะแนนทีมนำ'],
      ['0', 'ประตูรวม'],
    ],
    events: [],
    stats: [],
    table: [],
    lineup: [],
    notifications: [],
    topScorers: [],
    voteCandidates: [],
  }
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
  const fromSlot = Object.values(SLOT_TEAMS).find((t) => t.id === id)
  if (fromSlot) return fromSlot
  return {
    id,
    nameTh: id,
    nameEn: id,
    shortName: id.slice(0, 2).toUpperCase(),
    crestUrl: '',
    orgTh: id,
  }
}

function mapMatch(
  row: DbMatch,
  teams: Map<string, Team>,
  goalsByMatch: Map<string, MatchGoal[]>,
): Match {
  const base: Match = {
    id: row.id,
    sport: row.sport,
    competitionId: row.competition_id,
    seasonId: row.season_id,
    homeTeam: teamById(teams, row.home_team_id),
    awayTeam: teamById(teams, row.away_team_id),
    scheduledAt: row.scheduled_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    venue: row.venue ?? undefined,
    status: row.status,
    homeScore: row.home_score,
    awayScore: row.away_score,
    homePoints: row.home_points ?? undefined,
    awayPoints: row.away_points ?? undefined,
    pointsSet:
      row.points_set === 2 || row.points_set === 3
        ? row.points_set
        : row.sport === 'volleyball'
          ? 1
          : undefined,
    liveClock: row.live_clock ?? undefined,
    periodLabel: row.period_label ?? undefined,
    detail: false,
    groupCode: row.group_code === 'A' || row.group_code === 'B' ? row.group_code : undefined,
    stage:
      row.stage === 'group' ||
      row.stage === 'semi' ||
      row.stage === 'third' ||
      row.stage === 'final'
        ? row.stage
        : undefined,
    courtLabel: row.court_label ?? undefined,
    hideScheduleTime: Boolean(row.hide_schedule_time),
    matchOrder: row.match_order ?? undefined,
    // Never publish scorer rows from a match that has not started. This also
    // prevents old admin test events from appearing after a schedule reset.
    goals:
      row.status === 'live' || row.status === 'halftime' || row.status === 'finished'
        ? (goalsByMatch.get(row.id) ?? [])
        : [],
  }
  return base
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
    groupCode: row.group_code === 'A' || row.group_code === 'B' ? row.group_code : undefined,
    lotteryNote: row.lottery_note ?? undefined,
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
  const list = matches.filter(Boolean)
  return list.find((m) => m.status === 'live' || m.status === 'halftime') ?? list[0]
}

function buildHero(sport: SportType, match: Match | undefined): LiveHeroData {
  const label = sport === 'football' ? 'ฟุตซอล' : 'วอลเลย์บอลหญิง'
  if (!match) {
    return emptyBundle(sport).hero
  }

  const live = match.status === 'live' || match.status === 'halftime'
  const common: LiveHeroData = {
    league: [label, match.groupCode ? `สาย ${match.groupCode}` : match.stage, match.courtLabel]
      .filter(Boolean)
      .join(' · '),
    home: match.homeTeam,
    away: match.awayTeam,
    score: `${match.homeScore} - ${match.awayScore}`,
    pointsScore:
      sport === 'volleyball'
        ? `${match.homePoints ?? 0} - ${match.awayPoints ?? 0}`
        : undefined,
    pointsSetLabel: sport === 'volleyball' ? `เซต ${match.pointsSet ?? 1}` : undefined,
    state:
      match.periodLabel ??
      (live ? 'กำลังแข่งขัน' : match.status === 'finished' ? 'จบแล้ว' : 'รอแข่งขัน'),
    clock: match.liveClock ?? (live ? 'LIVE' : match.courtLabel ?? '—'),
    stats: [],
  }

  if (sport === 'volleyball') {
    return {
      ...common,
      stats: [
        [`${match.homeScore} - ${match.awayScore}`, 'เซต'],
        [`${match.homePoints ?? 0} - ${match.awayPoints ?? 0}`, `เซต ${match.pointsSet ?? 1}`],
        [match.periodLabel ?? '—', 'สถานะ'],
      ],
    }
  }

  return common
}

type TeamMatchStats = {
  played: number
  won: number
  drawn: number
  lost: number
  points: number
  goalsFor: number
  goalsAgainst: number
}

function emptyTeamStats(): TeamMatchStats {
  return { played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0 }
}

/** คิดแต้มจากแมตช์สายที่จบแล้ว: ชนะ 3 · เสมอ 1 · แพ้ 0 (รอบตัดเชือกไม่นับ) */
function enrichStandingsWithGoals(table: StandingRow[], matches: Match[]): StandingRow[] {
  const stats = new Map<string, TeamMatchStats>()
  for (const row of table) stats.set(row.team.id, emptyTeamStats())

  for (const m of matches) {
    const home = stats.get(m.homeTeam.id)
    const away = stats.get(m.awayTeam.id)
    if (!home || !away) continue

    const countsForPoints =
      m.status === 'finished' &&
      Boolean(m.groupCode) &&
      m.stage !== 'semi' &&
      m.stage !== 'third' &&
      m.stage !== 'final'
    if (!countsForPoints) continue

    home.goalsFor += m.homeScore
    home.goalsAgainst += m.awayScore
    away.goalsFor += m.awayScore
    away.goalsAgainst += m.homeScore
    home.played += 1
    away.played += 1
    if (m.homeScore > m.awayScore) {
      home.won += 1
      home.points += 3
      away.lost += 1
    } else if (m.homeScore < m.awayScore) {
      away.won += 1
      away.points += 3
      home.lost += 1
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
    }
  }

  const enriched = table.map((row) => {
    const s = stats.get(row.team.id) ?? emptyTeamStats()
    return {
      ...row,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      points: s.points,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDifference: s.goalsFor - s.goalsAgainst,
    }
  })

  // อันดับในสายตามแต้ม — แต้มเท่ากันคงลำดับเดิม (จับฉลากทำมือ)
  const byGroup = new Map<string, StandingRow[]>()
  for (const row of enriched) {
    const key = row.groupCode ?? '_'
    const list = byGroup.get(key) ?? []
    list.push(row)
    byGroup.set(key, list)
  }

  const ranked: StandingRow[] = []
  for (const list of byGroup.values()) {
    list.sort((a, b) => b.points - a.points || a.rank - b.rank)
    list.forEach((row, i) => {
      ranked.push({ ...row, previousRank: row.rank, rank: i + 1 })
    })
  }
  return ranked
}

function buildTopScorers(matches: Match[]): TopScorer[] {
  const map = new Map<string, TopScorer>()
  for (const m of matches) {
    for (const g of m.goals ?? []) {
      const key = `${g.teamId}:${g.jerseyNumber}`
      const prev = map.get(key)
      if (prev) {
        prev.goals += 1
        if (!prev.playerName && g.playerName) prev.playerName = g.playerName
        if (!prev.photoUrl && g.photoUrl) prev.photoUrl = g.photoUrl
        if (!prev.registrationId && g.registrationId) prev.registrationId = g.registrationId
      } else {
        const team =
          m.homeTeam.id === g.teamId
            ? m.homeTeam
            : m.awayTeam.id === g.teamId
              ? m.awayTeam
              : null
        map.set(key, {
          key,
          jerseyNumber: g.jerseyNumber,
          teamId: g.teamId,
          teamName: team?.nameTh ?? g.teamId,
          goals: 1,
          playerName: g.playerName,
          photoUrl: g.photoUrl,
          registrationId: g.registrationId,
        })
      }
    }
  }
  const thaiNumeric = new Intl.Collator('th', { numeric: true, sensitivity: 'base' })
  return [...map.values()].sort(
    (a, b) =>
      b.goals - a.goals ||
      thaiNumeric.compare(a.teamName, b.teamName) ||
      thaiNumeric.compare(a.jerseyNumber, b.jerseyNumber),
  )
}

function mergeBundle(
  sport: SportType,
  matches: Match[],
  table: StandingRow[],
  notifications: AppNotification[],
  voteCandidates: VoteCandidate[],
): SportBundle {
  const empty = emptyBundle(sport)
  const featured = liveMatch(matches)
  const done = matches.filter((m) => m.status === 'finished').length
  const scheduled = matches.filter((m) => m.status === 'scheduled').length
  const enriched = enrichStandingsWithGoals(table, matches)
  const leadPts = enriched.reduce((max, row) => Math.max(max, row.points), 0)
  const totalGoals = matches.reduce((sum, m) => sum + m.homeScore + m.awayScore, 0)
  const topScorers = sport === 'football' ? buildTopScorers(matches) : []

  return {
    ...empty,
    homeSub: empty.homeSub,
    liveSub: featured
      ? `${featured.homeTeam.nameTh} พบ ${featured.awayTeam.nameTh}`
      : empty.liveSub,
    hero: buildHero(sport, featured),
    matches,
    table: enriched,
    notifications,
    events: [],
    stats: [],
    lineup: [],
    topScorers,
    voteCandidates,
    quick: [
      [String(done), 'จบแล้ว'],
      [String(scheduled), 'รอแข่งขัน'],
      [String(leadPts), 'คะแนนทีมนำ'],
      [String(totalGoals), 'ประตูรวม'],
    ],
  }
}

async function fetchFromSupabase(sport: SportType): Promise<SportBundle> {
  if (!supabase) throw new Error('Supabase not configured')

  const seasonId = sport === 'football' ? 'season-2569-fb' : 'season-2569-vb'

  const [teamsRes, matchesRes, standingsRes, notifRes, goalsRes, regsRes, votesRes] =
    await Promise.all([
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
      supabase.from('match_goals').select('*').order('created_at', { ascending: true }),
      supabase
        .from('public_players')
        .select('id, sport, team_id, full_name, jersey_number, photo_url')
        .eq('sport', sport),
      supabase.from('favorite_vote_totals').select('registration_id, votes'),
    ])

  if (teamsRes.error) throw teamsRes.error
  if (matchesRes.error) throw matchesRes.error
  if (standingsRes.error) throw standingsRes.error
  if (notifRes.error) throw notifRes.error
  // Goals/votes tables may not exist yet on older DBs — treat as empty
  const goals = goalsRes.error ? [] : ((goalsRes.data ?? []) as DbGoal[])
  const regs = regsRes.error ? [] : ((regsRes.data ?? []) as DbRegistration[])
  const votes = votesRes.error ? [] : ((votesRes.data ?? []) as DbVote[])

  const teamMap = new Map((teamsRes.data as DbTeam[]).map((t) => [t.id, mapTeam(t)]))
  const regById = new Map(regs.map((r) => [r.id, r]))
  const regByTeamJersey = new Map(
    regs
      .filter((r) => r.jersey_number)
      .map((r) => [`${r.team_id}:${r.jersey_number}`, r] as const),
  )

  const goalsByMatch = new Map<string, MatchGoal[]>()
  for (const g of goals) {
    const jerseyNumber = g.jersey_number.trim()
    // Empty jersey numbers are private admin placeholders for goals whose scorer
    // will be identified later. They must not appear publicly or count as scorers.
    if (!jerseyNumber) continue
    const fromReg = g.registration_id ? regById.get(g.registration_id) : undefined
    const byJersey = regByTeamJersey.get(`${g.team_id}:${jerseyNumber}`)
    const linked = fromReg ?? byJersey
    const mapped: MatchGoal = {
      id: g.id,
      matchId: g.match_id,
      teamId: g.team_id,
      jerseyNumber,
      minuteApprox: g.minute_approx ?? undefined,
      playerName: g.player_name ?? linked?.full_name ?? undefined,
      photoUrl: linked?.photo_url ?? undefined,
      registrationId: g.registration_id ?? linked?.id,
    }
    const list = goalsByMatch.get(g.match_id) ?? []
    list.push(mapped)
    goalsByMatch.set(g.match_id, list)
  }

  const matchIds = new Set((matchesRes.data as DbMatch[]).map((m) => m.id))
  for (const [mid] of [...goalsByMatch.entries()]) {
    if (!matchIds.has(mid)) goalsByMatch.delete(mid)
  }

  const matches = (matchesRes.data as DbMatch[]).map((m) => mapMatch(m, teamMap, goalsByMatch))
  const table = (standingsRes.data as DbStanding[]).map((s) => mapStanding(s, teamMap))
  const notifications = (notifRes.data as DbNotification[]).map(mapNotification)

  const voteCount = new Map<string, number>()
  for (const v of votes) {
    voteCount.set(v.registration_id, v.votes)
  }

  const voteCandidates: VoteCandidate[] = regs
    .filter((r) => r.sport === sport)
    .map((r) => ({
      id: r.id,
      fullName: r.full_name,
      jerseyNumber: r.jersey_number ?? undefined,
      teamId: r.team_id,
      teamName: teamById(teamMap, r.team_id).nameTh,
      photoUrl: r.photo_url ?? undefined,
      votes: voteCount.get(r.id) ?? 0,
    }))
    .sort((a, b) => b.votes - a.votes || a.fullName.localeCompare(b.fullName, 'th'))

  return mergeBundle(sport, matches, table, notifications, voteCandidates)
}

export async function loadSportBundle(sport: SportType): Promise<SportBundle> {
  if (!isSupabaseConfigured) {
    return emptyBundle(sport)
  }
  return fetchFromSupabase(sport)
}

/** One lightweight query lets the viewer detect a missed Realtime score update. */
export async function loadLatestMatchRevision(sport: SportType): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('matches')
    .select('updated_at')
    .eq('sport', sport)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0]?.updated_at ?? null
}

export function subscribeSportUpdates(
  sport: SportType,
  onChange: () => void,
): (() => void) | null {
  if (!supabase) return null

  let subscribedOnce = false
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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_goals' }, () =>
      onChange(),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'favorite_votes', filter: `sport=eq.${sport}` },
      () => onChange(),
    )
    .subscribe((status) => {
      // A recovered socket can have missed updates while it was disconnected.
      if (status === 'SUBSCRIBED' && subscribedOnce) onChange()
      if (status === 'SUBSCRIBED') subscribedOnce = true
    })

  return () => {
    void supabase!.removeChannel(channel)
  }
}

export { isSupabaseConfigured }

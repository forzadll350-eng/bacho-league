export type SportType = 'football' | 'volleyball'

export type MatchStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'

export type AppPage =
  | 'home'
  | 'fixtures'
  | 'standings'
  | 'more'
  | 'register'
  | 'attendee'
  | 'players'
  | 'vote'

export type ThemeMode = 'dark' | 'light'

export type MatchStage = 'group' | 'semi' | 'third' | 'final'

export type PlayerPosition =
  | 'admin_exec'
  | 'council'
  | 'civil_servant'
  | 'mission'
  | 'general'
  | 'contract'

export type FootballEventType =
  | 'goal'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'penalty'
  | 'own_goal'
  | 'var'

export interface Team {
  id: string
  nameTh: string
  nameEn: string
  shortName: string
  crestUrl: string
  orgTh: string
}

export interface Competition {
  id: string
  nameTh: string
  nameEn: string
  sport: SportType
}

export interface Season {
  id: string
  name: string
  yearBe: number
  competitionId: string
}

export interface Match {
  id: string
  sport: SportType
  competitionId: string
  seasonId: string
  homeTeam: Team
  awayTeam: Team
  scheduledAt: string
  /** Actual kickoff, stamped when status first changes to live */
  startedAt?: string
  endsAt?: string
  venue?: string
  status: MatchStatus
  homeScore: number
  awayScore: number
  /** Rally points in the current/selected set (volleyball) */
  homePoints?: number
  awayPoints?: number
  /** Which set (1–3) homePoints/awayPoints refer to */
  pointsSet?: 1 | 2 | 3
  liveClock?: string
  periodLabel?: string
  detail?: boolean
  hideScheduleTime?: boolean
  /** Display order within its group; knockout matches share one sequence */
  matchOrder?: number
  groupCode?: 'A' | 'B'
  stage?: MatchStage
  courtLabel?: string
  goals?: MatchGoal[]
}

export interface MatchGoal {
  id: string
  matchId: string
  teamId: string
  jerseyNumber: string
  minuteApprox?: number
  playerName?: string
  photoUrl?: string
  registrationId?: string
}

export interface TopScorer {
  key: string
  jerseyNumber: string
  teamId: string
  teamName: string
  goals: number
  playerName?: string
  photoUrl?: string
  registrationId?: string
}

export interface VoteCandidate {
  id: string
  fullName: string
  jerseyNumber?: string
  teamId: string
  teamName: string
  photoUrl?: string
  votes: number
}

export interface FootballMatchEvent {
  id: string
  matchId: string
  minute: number
  addedTime?: number
  type: FootballEventType
  teamId: string
  playerName?: string
  secondaryPlayerName?: string
  homeScore?: number
  awayScore?: number
  label?: string
}

export interface VolleyballSet {
  setNumber: number
  homePoints: number
  awayPoints: number
  completed: boolean
}

export interface VolleyballEvent {
  id: string
  matchId: string
  setNumber: number
  type: 'point' | 'timeout' | 'set_won'
  teamId?: string
  label: string
  sub?: string
  scoreLabel?: string
}

export interface MatchStat {
  key: string
  labelTh: string
  labelEn: string
  value: string
}

export interface StandingRow {
  rank: number
  previousRank?: number
  team: Team
  played: number
  won?: number
  drawn?: number
  lost?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDifference?: number
  setsWon?: number
  setsLost?: number
  points: number
  groupCode?: 'A' | 'B'
  lotteryNote?: string
}

export interface LineupPlayer {
  number: string
  name: string
  position: string
}

export interface AppNotification {
  id: string
  sport: SportType
  icon: string
  title: string
  body: string
  timeLabel: string
}

export interface LiveHeroData {
  league: string
  home: Team
  away: Team
  score: string
  /** Current-set rally points, e.g. "10 - 8" (volleyball) */
  pointsScore?: string
  /** Label for which set points belong to, e.g. "เซต 2" */
  pointsSetLabel?: string
  state: string
  clock: string
  stats: [string, string][]
  sets?: VolleyballSet[]
}

export interface SportBundle {
  homeSub: string
  liveSub: string
  hero: LiveHeroData
  matches: Match[]
  quick: [string, string][]
  events: FootballMatchEvent[] | VolleyballEvent[]
  stats: MatchStat[]
  table: StandingRow[]
  lineup: LineupPlayer[]
  notifications: AppNotification[]
  topScorers: TopScorer[]
  voteCandidates: VoteCandidate[]
}

import type {
  FootballMatchEvent,
  Match,
  MatchStat,
  SportBundle,
  SportType,
  StandingRow,
  VolleyballEvent,
} from '../types/sports'
import { LEAGUE, TEAMS } from './teams'

const SEASON_ID = 'season-2569'
const FB_COMP = 'comp-football'
const VB_COMP = 'comp-volleyball'

function standing(
  rank: number,
  teamKey: keyof typeof TEAMS,
  points: number,
  previousRank?: number,
  extras: Partial<StandingRow> = {},
): StandingRow {
  return {
    rank,
    previousRank,
    team: TEAMS[teamKey],
    played: extras.played ?? 7,
    won: extras.won,
    drawn: extras.drawn,
    lost: extras.lost,
    goalsFor: extras.goalsFor,
    goalsAgainst: extras.goalsAgainst,
    goalDifference: extras.goalDifference,
    setsWon: extras.setsWon,
    setsLost: extras.setsLost,
    points,
  }
}

function deltaLabel(row: StandingRow): string {
  if (row.previousRank == null) return '—'
  const d = row.previousRank - row.rank
  if (d > 0) return `↑${d}`
  if (d < 0) return `↓${Math.abs(d)}`
  return '—'
}

export function standingDelta(row: StandingRow): string {
  return deltaLabel(row)
}

const footballMatches: Match[] = [
  {
    id: 'fb-live-1',
    sport: 'football',
    competitionId: FB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.bachoMunicipal,
    awayTeam: TEAMS.bareNuea,
    scheduledAt: '2026-09-10T12:30:00+07:00',
    venue: 'สนามเทศบาลบาเจาะ',
    status: 'live',
    homeScore: 2,
    awayScore: 1,
    liveClock: '68:24',
    periodLabel: 'ครึ่งหลัง',
    detail: true,
  },
  {
    id: 'fb-2',
    sport: 'football',
    competitionId: FB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.lubosawo,
    awayTeam: TEAMS.palukasamoh,
    scheduledAt: '2026-09-10T15:00:00+07:00',
    venue: 'สนามอบต.ลุโบะสาวอ',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: 'fb-3',
    sport: 'football',
    competitionId: FB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.tonsai,
    awayTeam: TEAMS.kayohMati,
    scheduledAt: '2026-09-10T18:00:00+07:00',
    venue: 'สนามเทศบาลต้นไทร',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
  {
    id: 'fb-4',
    sport: 'football',
    competitionId: FB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.bachoSao,
    awayTeam: TEAMS.barehtai,
    scheduledAt: '2026-09-10T19:30:00+07:00',
    venue: 'สนามอบต.บาเจาะ',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
]

const volleyballMatches: Match[] = [
  {
    id: 'vb-1',
    sport: 'volleyball',
    competitionId: VB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.palukasamoh,
    awayTeam: TEAMS.tonsai,
    scheduledAt: '2026-09-10T13:00:00+07:00',
    venue: 'อินดอร์ อำเภอบาเจาะ',
    status: 'finished',
    homeScore: 1,
    awayScore: 3,
  },
  {
    id: 'vb-live-1',
    sport: 'volleyball',
    competitionId: VB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.lubosawo,
    awayTeam: TEAMS.bachoMunicipal,
    scheduledAt: '2026-09-10T18:30:00+07:00',
    venue: 'อินดอร์ อำเภอบาเจาะ',
    status: 'live',
    homeScore: 2,
    awayScore: 1,
    liveClock: 'SET 4',
    periodLabel: 'เซต 4 • 18–16',
    detail: true,
  },
  {
    id: 'vb-3',
    sport: 'volleyball',
    competitionId: VB_COMP,
    seasonId: SEASON_ID,
    homeTeam: TEAMS.kayohMati,
    awayTeam: TEAMS.bareNuea,
    scheduledAt: '2026-09-10T20:00:00+07:00',
    venue: 'กีฬาเวสน์ บาเจาะ',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
]

const footballEvents: FootballMatchEvent[] = [
  {
    id: 'e1',
    matchId: 'fb-live-1',
    minute: 68,
    type: 'goal',
    teamId: TEAMS.bareNuea.id,
    playerName: 'เดนิลสัน',
    homeScore: 2,
    awayScore: 1,
    label: 'อบต.บาเราะเหนือ • ประตู',
  },
  {
    id: 'e2',
    matchId: 'fb-live-1',
    minute: 61,
    type: 'substitution',
    teamId: TEAMS.bareNuea.id,
    playerName: 'เปลี่ยนตัว',
    label: 'อบต.บาเราะเหนือ',
  },
  {
    id: 'e3',
    matchId: 'fb-live-1',
    minute: 56,
    type: 'goal',
    teamId: TEAMS.bachoMunicipal.id,
    playerName: 'กฤษดา เค.',
    homeScore: 2,
    awayScore: 0,
    label: 'เทศบาลตำบลบาเจาะ • ประตู',
  },
  {
    id: 'e4',
    matchId: 'fb-live-1',
    minute: 35,
    type: 'yellow_card',
    teamId: TEAMS.bachoMunicipal.id,
    playerName: 'สารัช วาย.',
    label: 'ใบเหลือง',
  },
  {
    id: 'e5',
    matchId: 'fb-live-1',
    minute: 12,
    type: 'goal',
    teamId: TEAMS.bachoMunicipal.id,
    playerName: 'ฐิติพันธ์ พี.',
    homeScore: 1,
    awayScore: 0,
    label: 'เทศบาลตำบลบาเจาะ • ประตู',
  },
]

const volleyballEvents: VolleyballEvent[] = [
  {
    id: 've1',
    matchId: 'vb-live-1',
    setNumber: 4,
    type: 'point',
    teamId: TEAMS.lubosawo.id,
    label: 'อบต.ลุโบะสาวอ',
    sub: 'แต้มล่าสุด',
    scoreLabel: '18–16',
  },
  {
    id: 've2',
    matchId: 'vb-live-1',
    setNumber: 4,
    type: 'timeout',
    teamId: TEAMS.bachoMunicipal.id,
    label: 'เทศบาลตำบลบาเจาะ',
    sub: 'ขอเวลานอก',
    scoreLabel: '17–16',
  },
  {
    id: 've3',
    matchId: 'vb-live-1',
    setNumber: 3,
    type: 'set_won',
    teamId: TEAMS.lubosawo.id,
    label: 'อบต.ลุโบะสาวอ',
    sub: 'ชนะเซต',
    scoreLabel: '25–18',
  },
  {
    id: 've4',
    matchId: 'vb-live-1',
    setNumber: 2,
    type: 'set_won',
    teamId: TEAMS.bachoMunicipal.id,
    label: 'เทศบาลตำบลบาเจาะ',
    sub: 'ชนะเซต',
    scoreLabel: '22–25',
  },
  {
    id: 've5',
    matchId: 'vb-live-1',
    setNumber: 1,
    type: 'set_won',
    teamId: TEAMS.lubosawo.id,
    label: 'อบต.ลุโบะสาวอ',
    sub: 'ชนะเซต',
    scoreLabel: '25–20',
  },
]

const footballStats: MatchStat[] = [
  { key: 'possession', labelTh: 'ครองบอล', labelEn: 'Possession', value: '58%' },
  { key: 'shots', labelTh: 'ยิงทั้งหมด', labelEn: 'Shots', value: '12' },
  { key: 'sot', labelTh: 'ยิงเข้ากรอบ', labelEn: 'On target', value: '6' },
  { key: 'xg', labelTh: 'xG', labelEn: 'xG', value: '1.84' },
  { key: 'corners', labelTh: 'เตะมุม', labelEn: 'Corners', value: '5' },
  { key: 'fouls', labelTh: 'ฟาวล์', labelEn: 'Fouls', value: '9' },
]

const volleyballStats: MatchStat[] = [
  { key: 'spikes', labelTh: 'ตบสำเร็จ', labelEn: 'Spikes', value: '42' },
  { key: 'blocks', labelTh: 'บล็อก', labelEn: 'Blocks', value: '9' },
  { key: 'aces', labelTh: 'เสิร์ฟเอซ', labelEn: 'Aces', value: '6' },
  { key: 'errors', labelTh: 'ผิดพลาด', labelEn: 'Errors', value: '14' },
  { key: 'reception', labelTh: 'รีเซฟดี', labelEn: 'Reception', value: '61%' },
  { key: 'points', labelTh: 'แต้มรวม', labelEn: 'Total points', value: '90' },
]

export const MOCK: Record<SportType, SportBundle> = {
  football: {
    homeSub: 'ผลฟุตบอลสดและโปรแกรมประจำวันนี้',
    liveSub: `${TEAMS.bachoMunicipal.nameTh} พบ ${TEAMS.bareNuea.nameTh}`,
    hero: {
      league: `${LEAGUE.nameTh} • นัดที่ 8`,
      home: TEAMS.bachoMunicipal,
      away: TEAMS.bareNuea,
      score: '2–1',
      state: 'ครึ่งหลัง',
      clock: '68:24',
      stats: [
        ['58%', 'ครองบอล'],
        ['12', 'ยิงทั้งหมด'],
        ['1.84', 'xG'],
      ],
    },
    matches: footballMatches,
    quick: [
      ['2', 'กำลังแข่งขัน'],
      ['12', 'จบแล้ว'],
      ['5', 'รอแข่งขัน'],
      ['18', 'คะแนนทีมนำ'],
    ],
    events: footballEvents,
    stats: footballStats,
    table: [
      standing(1, 'bachoMunicipal', 18, 2, { won: 6, drawn: 0, lost: 1 }),
      standing(2, 'lubosawo', 16, 1, { won: 5, drawn: 1, lost: 1 }),
      standing(3, 'bareNuea', 14, 3, { won: 4, drawn: 2, lost: 1 }),
      standing(4, 'kayohMati', 12, 4, { won: 4, drawn: 0, lost: 3 }),
      standing(5, 'palukasamoh', 10, 5, { won: 3, drawn: 1, lost: 3 }),
      standing(6, 'tonsai', 9, 6, { won: 2, drawn: 3, lost: 2 }),
      standing(7, 'bachoSao', 7, 7, { won: 2, drawn: 1, lost: 4 }),
      standing(8, 'barehtai', 4, 8, { won: 1, drawn: 1, lost: 5 }),
    ],
    lineup: [
      { number: '1', name: 'กิตติพงษ์', position: 'ผู้รักษาประตู' },
      { number: '4', name: 'เอเวอร์ตัน', position: 'กองหลัง' },
      { number: '6', name: 'สารัช', position: 'กองกลาง' },
      { number: '18', name: 'ฐิติพันธ์', position: 'กองกลาง' },
      { number: '10', name: 'วานเดอร์', position: 'กองหน้า' },
    ],
    notifications: [
      {
        id: 'n1',
        sport: 'football',
        icon: 'G',
        title: 'ประตู! อบต.บาเราะเหนือไล่มา 2–1',
        body: 'เดนิลสันทำประตูในนาทีที่ 68',
        timeLabel: '1 นาที',
      },
      {
        id: 'n2',
        sport: 'football',
        icon: 'Y',
        title: 'ใบเหลือง',
        body: 'สารัชได้รับใบเหลือง นาที 35',
        timeLabel: '34 นาที',
      },
      {
        id: 'n3',
        sport: 'football',
        icon: 'L',
        title: 'เริ่มครึ่งหลัง',
        body: 'การแข่งขันกลับมาเริ่มอีกครั้ง',
        timeLabel: '23 นาที',
      },
    ],
  },
  volleyball: {
    homeSub: 'ผลวอลเลย์บอลสดและโปรแกรมประจำวันนี้',
    liveSub: `${TEAMS.lubosawo.nameTh} พบ ${TEAMS.bachoMunicipal.nameTh}`,
    hero: {
      league: `วอลเลย์บอลลีก • รอบปกติ`,
      home: TEAMS.lubosawo,
      away: TEAMS.bachoMunicipal,
      score: '2–1',
      state: 'เซต 4 • 18–16',
      clock: 'SET 4',
      stats: [
        ['18–16', 'คะแนนเซต'],
        ['2–1', 'เซต'],
        ['3', 'ไทม์เอาต์'],
      ],
      sets: [
        { setNumber: 1, homePoints: 25, awayPoints: 20, completed: true },
        { setNumber: 2, homePoints: 22, awayPoints: 25, completed: true },
        { setNumber: 3, homePoints: 25, awayPoints: 18, completed: true },
        { setNumber: 4, homePoints: 18, awayPoints: 16, completed: false },
        { setNumber: 5, homePoints: 0, awayPoints: 0, completed: false },
      ],
    },
    matches: volleyballMatches,
    quick: [
      ['1', 'กำลังแข่งขัน'],
      ['8', 'จบแล้ว'],
      ['3', 'รอแข่งขัน'],
      ['15', 'คะแนนทีมนำ'],
    ],
    events: volleyballEvents,
    stats: volleyballStats,
    table: [
      standing(1, 'lubosawo', 15, 1, { setsWon: 18, setsLost: 6 }),
      standing(2, 'bachoMunicipal', 13, 2, { setsWon: 16, setsLost: 8 }),
      standing(3, 'kayohMati', 12, 4, { setsWon: 14, setsLost: 9 }),
      standing(4, 'tonsai', 10, 3, { setsWon: 12, setsLost: 11 }),
      standing(5, 'bareNuea', 8, 5, { setsWon: 10, setsLost: 12 }),
      standing(6, 'palukasamoh', 7, 6, { setsWon: 9, setsLost: 14 }),
      standing(7, 'barehtai', 5, 7, { setsWon: 7, setsLost: 15 }),
      standing(8, 'bachoSao', 3, 8, { setsWon: 5, setsLost: 16 }),
    ],
    lineup: [
      { number: '4', name: 'ณัฐณิชา', position: 'Setter' },
      { number: '8', name: 'พิมพิชยา', position: 'Opposite' },
      { number: '12', name: 'อัจฉราพร', position: 'Outside' },
      { number: '15', name: 'ทัดดาว', position: 'Middle' },
      { number: '2', name: 'ปิยะนุช', position: 'Libero' },
    ],
    notifications: [
      {
        id: 'vn1',
        sport: 'volleyball',
        icon: 'P',
        title: 'แต้มล่าสุด 18–16',
        body: 'อบต.ลุโบะสาวอนำในเซตที่ 4',
        timeLabel: 'ตอนนี้',
      },
      {
        id: 'vn2',
        sport: 'volleyball',
        icon: 'T',
        title: 'เทศบาลตำบลบาเจาะขอเวลานอก',
        body: 'ช่วงเซตที่ 4 คะแนน 17–16',
        timeLabel: '1 นาที',
      },
      {
        id: 'vn3',
        sport: 'volleyball',
        icon: 'W',
        title: 'จบเซต 3',
        body: 'อบต.ลุโบะสาวอชนะ 25–18',
        timeLabel: '18 นาที',
      },
    ],
  },
}

export { LEAGUE }

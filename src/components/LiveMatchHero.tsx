import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { TeamCrest } from './TeamCrest'
import { LeadAura } from './LeadAura'
import { GoalChips } from './GoalChips'
import type { LiveHeroData, MatchGoal, MatchStatus } from '../types/sports'

function parseScore(score: string): { home: number; away: number } | null {
  const m = score.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!m) return null
  return { home: Number(m[1]), away: Number(m[2]) }
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** นาฬิกานัดสด — นับจากเวลาเริ่มเป็นวินาที */
function useMatchClock(
  isLive: boolean,
  status?: MatchStatus,
  scheduledAt?: string,
  fallback?: string,
) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!isLive) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [isLive])

  return useMemo(() => {
    if (status === 'halftime') return 'พักครึ่ง'
    if (status === 'finished') return 'จบแล้ว'
    if (!isLive || !scheduledAt) return fallback ?? '—'
    const start = new Date(scheduledAt).getTime()
    if (Number.isNaN(start)) return fallback ?? 'LIVE'
    const elapsed = Math.max(0, Math.floor((now - start) / 1000))
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${m}:${pad2(s)}`
  }, [isLive, status, scheduledAt, fallback, now])
}

function mockPhoto(_seed: string, label: string): string {
  const safe = encodeURIComponent(label.slice(0, 2))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3b4a6b"/><stop offset="1" stop-color="#1b2438"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/><circle cx="120" cy="92" r="42" fill="#d7deea"/><ellipse cx="120" cy="200" rx="70" ry="54" fill="#d7deea"/><text x="120" y="228" text-anchor="middle" fill="#8fa0bd" font-size="22" font-family="sans-serif">${safe}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function mockGoals(homeTeamId: string, awayTeamId: string, matchId: string): MatchGoal[] {
  return [
    {
      id: `${matchId}-mock-h1`,
      matchId,
      teamId: homeTeamId,
      jerseyNumber: '9',
      minuteApprox: 12,
      playerName: 'สมชาย ใจดี',
      photoUrl: mockPhoto(`${matchId}-h9`, 'สม'),
    },
    {
      id: `${matchId}-mock-h2`,
      matchId,
      teamId: homeTeamId,
      jerseyNumber: '7',
      minuteApprox: 28,
      playerName: 'วิชัย รุ่งเรือง',
      photoUrl: mockPhoto(`${matchId}-h7`, 'วิ'),
    },
    {
      id: `${matchId}-mock-a1`,
      matchId,
      teamId: awayTeamId,
      jerseyNumber: '10',
      minuteApprox: 35,
      playerName: 'อนุชา เก่งกาจ',
      photoUrl: mockPhoto(`${matchId}-a10`, 'อน'),
    },
  ]
}

export function LiveMatchHero({
  compact = false,
  hero,
  isLive = false,
  goals,
  homeTeamId,
  matchId,
  matchStatus,
  scheduledAt,
}: {
  compact?: boolean
  hero?: LiveHeroData
  isLive?: boolean
  goals?: MatchGoal[]
  homeTeamId?: string
  matchId?: string
  matchStatus?: MatchStatus
  scheduledAt?: string
}) {
  const { sport, data } = useApp()
  const h = hero ?? data.hero
  const isV = sport === 'volleyball'
  const scores = parseScore(h.score)

  const displayGoals = useMemo(() => {
    if (isV || !homeTeamId) return []
    if (goals && goals.length > 0) return goals
    // mock layout แบบ Google จนกว่าแอดมินจะบันทึกผู้ยิงจริง
    return mockGoals(homeTeamId, h.away.id, matchId ?? 'demo')
  }, [goals, homeTeamId, h.away.id, isV, matchId])

  const isMockGoals = !isV && (!goals || goals.length === 0) && displayGoals.length > 0
  const displayScore = isMockGoals ? { home: 2, away: 1 } : scores
  const showLead =
    isLive ||
    isMockGoals ||
    (displayScore != null && (displayScore.home > 0 || displayScore.away > 0))
  const homeLeading = showLead && displayScore != null && displayScore.home > displayScore.away
  const awayLeading = showLead && displayScore != null && displayScore.away > displayScore.home

  const [mockKickoff] = useState(() => Date.now() - 3 * 60 * 1000 - 45 * 1000)
  const clockLabel = useMatchClock(
    isLive || isMockGoals,
    isLive ? matchStatus : isMockGoals ? 'live' : matchStatus,
    isLive ? scheduledAt : isMockGoals ? new Date(mockKickoff).toISOString() : scheduledAt,
    h.clock,
  )

  return (
    <article className={`hero google-hero${isV ? ' volleyball' : ''}${compact ? ' compact' : ''}`}>
      <div className="hero-head">
        <div className="match-meta">{h.league}</div>
        <div className={`live-pill${isLive || isMockGoals ? '' : ' wait'}`}>
          {isLive || isMockGoals ? <span className="pulse" /> : null}
          <span className="live-clock">{clockLabel}</span>
        </div>
      </div>

      <div className="g-board">
        <div className={`g-side${homeLeading ? ' is-leading' : ''}`}>
          <div className="crest-wrap">
            {homeLeading ? <LeadAura /> : null}
            <TeamCrest team={h.home} />
          </div>
          <b>{h.home.nameTh}</b>
        </div>

        <div className="g-scoreline" aria-label={`สกอร์ ${displayScore?.home ?? '—'} ต่อ ${displayScore?.away ?? '—'}`}>
          {displayScore ? (
            <>
              <span className="sports-num g-num">{displayScore.home}</span>
              <span className="g-dash" aria-hidden>
                -
              </span>
              <span className="sports-num g-num">{displayScore.away}</span>
            </>
          ) : (
            <span className="sports-num g-num">{h.score}</span>
          )}
        </div>

        <div className={`g-side${awayLeading ? ' is-leading' : ''}`}>
          <div className="crest-wrap">
            {awayLeading ? <LeadAura /> : null}
            <TeamCrest team={h.away} />
          </div>
          <b>{h.away.nameTh}</b>
        </div>
      </div>

      <div className="g-state">{isMockGoals ? `${h.state} · ตัวอย่างผู้ยิง` : h.state}</div>

      {!isV && homeTeamId && displayGoals.length > 0 ? (
        <GoalChips goals={displayGoals} homeTeamId={homeTeamId} />
      ) : null}

      {isV && h.stats.length > 0 ? (
        <div className="hero-stats">
          {h.stats.map(([value, label]) => (
            <div className="hero-stat" key={label}>
              <b className="sports-num">{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

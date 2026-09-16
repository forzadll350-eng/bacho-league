import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { formatElapsedClock, isMatchPlaying } from '../lib/matchClock'
import { TeamCrest } from './TeamCrest'
import { LeadAura } from './LeadAura'
import { GoalChips } from './GoalChips'
import type { LiveHeroData, MatchGoal, MatchStatus } from '../types/sports'
import { isLongTeamLocality, splitTeamName } from '../lib/teamName'

function parseScore(score: string): { home: number; away: number } | null {
  const m = score.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!m) return null
  return { home: Number(m[1]), away: Number(m[2]) }
}

/** นาฬิกานัดสด — นับจากเวลาเริ่มเป็นวินาที */
function useMatchClock(
  isLive: boolean,
  status?: MatchStatus,
  startedAt?: string,
  fallback?: string,
) {
  const [now, setNow] = useState(() => Date.now())
  const playing = isLive || isMatchPlaying(status)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [playing])

  return useMemo(() => {
    if (status === 'halftime') return 'พักครึ่ง'
    if (status === 'finished') return 'จบแล้ว'
    if (!playing || !startedAt) return fallback ?? '0:00'
    return formatElapsedClock(startedAt, now)
  }, [playing, status, startedAt, fallback, now])
}

export function LiveMatchHero({
  compact = false,
  hero,
  isLive = false,
  goals,
  homeTeamId,
  matchStatus,
  startedAt,
  hideScheduleTime = false,
  matchOrder,
}: {
  compact?: boolean
  hero?: LiveHeroData
  isLive?: boolean
  goals?: MatchGoal[]
  homeTeamId?: string
  matchId?: string
  matchStatus?: MatchStatus
  startedAt?: string
  hideScheduleTime?: boolean
  matchOrder?: number
}) {
  const { sport, data } = useApp()
  const h = hero ?? data.hero
  const homeName = splitTeamName(h.home.nameTh)
  const awayName = splitTeamName(h.away.nameTh)
  const isV = sport === 'volleyball'
  const scores = parseScore(h.score)
  const displayGoals = !isV && homeTeamId && goals && goals.length > 0 ? goals : []
  const playing = isLive || isMatchPlaying(matchStatus)
  const showLead =
    playing || (scores != null && (scores.home > 0 || scores.away > 0))
  const homeLeading = showLead && scores != null && scores.home > scores.away
  const awayLeading = showLead && scores != null && scores.away > scores.home

  const matchClockLabel = useMatchClock(isLive, matchStatus, startedAt, h.clock)
  const clockLabel = playing
    ? matchClockLabel
    : hideScheduleTime
      ? matchOrder ? `นัดที่ ${matchOrder}` : 'ไม่ระบุเวลา'
      : matchClockLabel

  return (
    <article className={`hero google-hero${isV ? ' volleyball' : ''}${compact ? ' compact' : ''}`}>
      <div className="hero-head">
        <div className="match-meta">{h.league}</div>
        <div className={`live-pill${playing ? '' : ' wait'}`} aria-label={playing ? `เวลาแข่ง ${clockLabel}` : `เวลาตาราง ${clockLabel}`}>
          {playing ? <span className="pulse" /> : null}
          {playing && matchStatus !== 'halftime' ? (
            <span className="live-pill-label">LIVE</span>
          ) : null}
          <span className="live-clock">{clockLabel}</span>
        </div>
      </div>

      <div className="g-board">
        <div className={`g-side${homeLeading ? ' is-leading' : ''}`}>
          <div className="crest-wrap">
            {homeLeading ? <LeadAura /> : null}
            <TeamCrest team={h.home} />
          </div>
          <span className="g-team-name">
            {homeName.org ? <span className="g-team-org">{homeName.org}</span> : null}
            <b className={`g-team-locality${homeName.org ? '' : ' single'}${isLongTeamLocality(homeName.locality) ? ' long' : ''}`}>
              {homeName.locality}
            </b>
          </span>
        </div>

        <div className="g-score-stack">
          <div
            className="g-scoreline"
            aria-label={
              isV
                ? `เซต ${scores?.home ?? '—'} ต่อ ${scores?.away ?? '—'}`
                : `สกอร์ ${scores?.home ?? '—'} ต่อ ${scores?.away ?? '—'}`
            }
          >
            {scores ? (
              <>
                <span className="sports-num g-num">{scores.home}</span>
                <span className="g-dash" aria-hidden>
                  -
                </span>
                <span className="sports-num g-num">{scores.away}</span>
              </>
            ) : (
              <span className="sports-num g-num">{h.score}</span>
            )}
          </div>
          {isV && h.pointsScore ? (
            <div
              className="g-points"
              aria-label={`${h.pointsSetLabel ?? 'แต้ม'} ${h.pointsScore}`}
            >
              <span className="g-points-label">{h.pointsSetLabel ?? 'แต้ม'}</span>
              <span className="sports-num g-points-num">
                {h.pointsScore.replace(/\s*-\s*/, ' – ')}
              </span>
            </div>
          ) : null}
        </div>

        <div className={`g-side${awayLeading ? ' is-leading' : ''}`}>
          <div className="crest-wrap">
            {awayLeading ? <LeadAura /> : null}
            <TeamCrest team={h.away} />
          </div>
          <span className="g-team-name">
            {awayName.org ? <span className="g-team-org">{awayName.org}</span> : null}
            <b className={`g-team-locality${awayName.org ? '' : ' single'}${isLongTeamLocality(awayName.locality) ? ' long' : ''}`}>
              {awayName.locality}
            </b>
          </span>
        </div>
      </div>

      <div className="g-state">{h.state}</div>

      {!isV && homeTeamId && displayGoals.length > 0 ? (
        <GoalChips goals={displayGoals} homeTeamId={homeTeamId} />
      ) : null}
    </article>
  )
}

import { Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Match } from '../types/sports'
import { formatElapsedClock, isMatchPlaying } from '../lib/matchClock'
import { GoalChips } from './GoalChips'
import { canShareMatch, openMatchShare } from '../lib/matchShare'
import { matchOrderLabel } from '../lib/matchOrder'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function timeRange(m: Match) {
  const start = formatTime(m.scheduledAt)
  if (m.endsAt) return `${start}–${formatTime(m.endsAt)}`
  return start
}

function statusClass(m: Match) {
  if (m.status === 'finished') return 'done'
  if (m.status === 'live' || m.status === 'halftime') return 'live'
  return ''
}

function statusLabel(m: Match, liveClock?: string) {
  if (m.status === 'finished') return `จบ ${m.homeScore} - ${m.awayScore}`
  if (m.status === 'halftime') return `พัก ${m.homeScore} - ${m.awayScore}`
  if (m.status === 'live') return liveClock ? `สด ${liveClock}` : `${m.homeScore} - ${m.awayScore}`
  if (m.status === 'postponed') return 'เลื่อน'
  if (m.status === 'cancelled') return 'ยกเลิก'
  return 'รอแข่งขัน'
}

function scoreDisplay(m: Match) {
  if (m.status === 'scheduled' || m.status === 'postponed' || m.status === 'cancelled') {
    return '—'
  }
  return `${m.homeScore} - ${m.awayScore}`
}

function pointsDisplay(m: Match) {
  if (m.sport !== 'volleyball') return null
  if (m.status === 'scheduled' || m.status === 'postponed' || m.status === 'cancelled') {
    return null
  }
  return {
    label: `เซต ${m.pointsSet ?? 1}`,
    score: `${m.homePoints ?? 0} – ${m.awayPoints ?? 0}`,
  }
}

const TEAM_ORG_PREFIXES = ['เทศบาลตำบล', 'อบต.'] as const

function splitTeamName(nameTh: string) {
  const fullName = nameTh.trim()
  const org = TEAM_ORG_PREFIXES.find((prefix) => fullName.startsWith(prefix))

  if (!org) return { org: null, locality: fullName }

  const locality = fullName.slice(org.length).trim()
  return locality ? { org, locality } : { org: null, locality: fullName }
}

function MiniTeamName({ nameTh }: { nameTh: string }) {
  const { org, locality } = splitTeamName(nameTh)

  return (
    <span className="mini-team-name">
      {org ? <span className="mini-team-org">{org}</span> : null}
      <span className={`mini-team-locality${org ? '' : ' single'}`}>
        {locality}
      </span>
    </span>
  )
}

function useLiveElapsed(match: Match) {
  const playing = isMatchPlaying(match.status)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [playing])

  if (!playing) return null
  if (match.status === 'halftime') return 'พักครึ่ง'
  return match.startedAt ? formatElapsedClock(match.startedAt, now) : '0:00'
}

function MatchRow({
  match,
  pts,
}: {
  match: Match
  pts: { label: string; score: string } | null
}) {
  return (
    <div className="match-row">
      <div className="mini-team">
        <img
          className="mini-crest"
          src={match.homeTeam.crestUrl}
          alt=""
          loading="lazy"
          decoding="async"
          width={40}
          height={40}
        />
        <MiniTeamName nameTh={match.homeTeam.nameTh} />
      </div>
      <div className="mini-score-stack">
        <div className="mini-score sports-num">{scoreDisplay(match)}</div>
        {pts ? (
          <div
            className="mini-points sports-num"
            aria-label={`${pts.label} ${pts.score}`}
          >
            <span className="mini-points-set">{pts.label}</span> {pts.score}
          </div>
        ) : null}
      </div>
      <div className="mini-team right">
        <img
          className="mini-crest"
          src={match.awayTeam.crestUrl}
          alt=""
          loading="lazy"
          decoding="async"
          width={40}
          height={40}
        />
        <MiniTeamName nameTh={match.awayTeam.nameTh} />
      </div>
    </div>
  )
}

export function MatchCard({ match }: { match: Match }) {
  const liveClock = useLiveElapsed(match)
  const pts = pointsDisplay(match)
  const shareable = canShareMatch(match)
  const playing = isMatchPlaying(match.status)
  const topTime = liveClock && playing
    ? liveClock
    : match.hideScheduleTime
      ? matchOrderLabel(match)
      : timeRange(match)

  return (
    <article className="card match-card match-card-static">
      <div className="match-top">
        <span
          className={
            playing
              ? 'match-live-clock'
              : undefined
          }
        >
          {topTime}
        </span>
        <div className="match-top-right">
          {shareable ? (
            <button
              type="button"
              className="match-share-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openMatchShare(match)
              }}
              aria-label={`แชร์ผล ${match.homeTeam.nameTh} พบ ${match.awayTeam.nameTh}`}
            >
              <Share2 size={11} strokeWidth={2} />
              แชร์ผล
            </button>
          ) : null}
          <span className={`status ${statusClass(match)}`}>
            {statusLabel(match, liveClock ?? undefined)}
          </span>
        </div>
      </div>
      {shareable ? (
        <button
          type="button"
          className="match-row-btn"
          onClick={() => openMatchShare(match)}
          aria-label={`เปิดการ์ดผลแข่ง ${match.homeTeam.nameTh} พบ ${match.awayTeam.nameTh}`}
        >
          <MatchRow match={match} pts={pts} />
        </button>
      ) : (
        <div className="match-row-static">
          <MatchRow match={match} pts={pts} />
        </div>
      )}
      {match.goals && match.goals.length > 0 ? (
        <GoalChips goals={match.goals} homeTeamId={match.homeTeam.id} />
      ) : null}
    </article>
  )
}

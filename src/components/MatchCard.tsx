import { Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Match } from '../types/sports'
import { formatElapsedClock, isMatchPlaying } from '../lib/matchClock'
import { GoalChips } from './GoalChips'
import { canShareMatch, openMatchShare } from '../lib/matchShare'

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
        <span>{match.homeTeam.nameTh}</span>
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
        <span>{match.awayTeam.nameTh}</span>
      </div>
    </div>
  )
}

export function MatchCard({ match }: { match: Match }) {
  const liveClock = useLiveElapsed(match)
  const pts = pointsDisplay(match)
  const shareable = canShareMatch(match)
  const topTime = match.hideScheduleTime
    ? 'กำลังแข่งขัน'
    : liveClock && match.status === 'live'
      ? liveClock
      : timeRange(match)

  return (
    <article className="card match-card match-card-static">
      <div className="match-top">
        <span
          className={
            match.hideScheduleTime || (liveClock && match.status === 'live')
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

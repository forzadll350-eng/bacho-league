import type { Match } from '../types/sports'
import { GoalChips } from './GoalChips'

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

function statusLabel(m: Match) {
  if (m.status === 'finished') return `จบ ${m.homeScore} - ${m.awayScore}`
  if (m.status === 'live' || m.status === 'halftime') return `${m.homeScore} - ${m.awayScore}`
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

export function MatchCard({ match }: { match: Match }) {
  return (
    <div className="card match-card match-card-static">
      <div className="match-top">
        <span>{timeRange(match)}</span>
        <span className={`status ${statusClass(match)}`}>{statusLabel(match)}</span>
      </div>
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
        <div className="mini-score sports-num">{scoreDisplay(match)}</div>
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
      {match.goals && match.goals.length > 0 ? (
        <GoalChips goals={match.goals} homeTeamId={match.homeTeam.id} />
      ) : null}
    </div>
  )
}

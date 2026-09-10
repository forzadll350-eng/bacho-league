import type { Match } from '../types/sports'
import { useApp } from '../context/AppContext'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function statusClass(m: Match) {
  if (m.status === 'live' || m.status === 'halftime') return 'live'
  if (m.status === 'finished') return 'done'
  return ''
}

function statusLabel(m: Match) {
  if (m.status === 'live') return `สด ${m.homeScore}–${m.awayScore}`
  if (m.status === 'halftime') return `ครึ่งเวลา ${m.homeScore}–${m.awayScore}`
  if (m.status === 'finished') return `จบ ${m.homeScore}–${m.awayScore}`
  if (m.status === 'postponed') return 'เลื่อน'
  if (m.status === 'cancelled') return 'ยกเลิก'
  return 'รอแข่งขัน'
}

function scoreDisplay(m: Match) {
  if (m.status === 'scheduled' || m.status === 'postponed' || m.status === 'cancelled') {
    return '—'
  }
  return `${m.homeScore}–${m.awayScore}`
}

export function MatchCard({ match }: { match: Match }) {
  const { openDetail } = useApp()
  const clickable = Boolean(match.detail)

  return (
    <button
      type="button"
      className="card match-card"
      onClick={clickable ? openDetail : undefined}
      disabled={!clickable}
      style={clickable ? undefined : { cursor: 'default' }}
    >
      <div className="match-top">
        <span>
          {formatTime(match.scheduledAt)} • {match.venue}
        </span>
        <span className={`status ${statusClass(match)}`}>{statusLabel(match)}</span>
      </div>
      <div className="match-row">
        <div className="mini-team">
          <img className="mini-crest" src={match.homeTeam.crestUrl} alt="" />
          <span>{match.homeTeam.nameTh}</span>
        </div>
        <div className="mini-score sports-num">{scoreDisplay(match)}</div>
        <div className="mini-team right">
          <img className="mini-crest" src={match.awayTeam.crestUrl} alt="" />
          <span>{match.awayTeam.nameTh}</span>
        </div>
      </div>
    </button>
  )
}

import { standingDelta } from '../data/mock'
import type { StandingRow } from '../types/sports'

export function StandingsTable({
  rows,
  limit,
}: {
  rows: StandingRow[]
  limit?: number
}) {
  const list = limit ? rows.slice(0, limit) : rows

  return (
    <div className="card live-table">
      <div className="lt-head">
        <div>#</div>
        <div>ทีม</div>
        <div style={{ textAlign: 'center' }}>Live</div>
        <div style={{ textAlign: 'right' }}>แต้ม</div>
      </div>
      {list.map((r) => {
        const delta = standingDelta(r)
        const deltaClass = delta.startsWith('↑') ? 'up' : delta.startsWith('↓') ? 'down' : ''
        return (
          <div className="lt-row" key={r.team.id}>
            <div className="lt-rank">{r.rank}</div>
            <div className="lt-club">
              <span className="club-dot">
                <img src={r.team.crestUrl} alt="" />
              </span>
              <b>{r.team.nameTh}</b>
            </div>
            <div className={`delta ${deltaClass}`} aria-label={`อันดับ ${delta}`}>
              {delta}
            </div>
            <div className="lt-pts">{r.points}</div>
          </div>
        )
      })}
    </div>
  )
}

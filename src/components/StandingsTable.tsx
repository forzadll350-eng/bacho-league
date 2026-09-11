import type { StandingRow } from '../types/sports'

function fmtGd(n: number | undefined) {
  if (n == null) return '0'
  if (n > 0) return `+${n}`
  return String(n)
}

export function StandingsTable({
  rows,
  limit,
  title,
}: {
  rows: StandingRow[]
  limit?: number
  title?: string
}) {
  const list = limit ? rows.slice(0, limit) : rows

  return (
    <div className="card live-table">
      {title ? <div className="lt-title">{title}</div> : null}
      <div className="lt-head lt-head-full">
        <div>#</div>
        <div>ทีม</div>
        <div>ลง</div>
        <div>ได้</div>
        <div>เสีย</div>
        <div>+/−</div>
        <div>แต้ม</div>
      </div>
      {list.length === 0 ? (
        <div className="lt-empty">ยังไม่มีทีมในสายนี้</div>
      ) : (
        list.map((r) => (
          <div className="lt-row lt-row-full" key={`${r.groupCode ?? 'x'}-${r.team.id}`}>
            <div className="lt-rank">{r.rank}</div>
            <div className="lt-club">
              <span className="club-dot">
                <img
                  src={r.team.crestUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={34}
                  height={34}
                />
              </span>
              <b>{r.team.nameTh}</b>
            </div>
            <div className="lt-num">{r.played}</div>
            <div className="lt-num">{r.goalsFor ?? 0}</div>
            <div className="lt-num">{r.goalsAgainst ?? 0}</div>
            <div className="lt-num lt-gd">{fmtGd(r.goalDifference)}</div>
            <div className="lt-pts">{r.points}</div>
          </div>
        ))
      )}
    </div>
  )
}

import { useApp } from '../context/AppContext'

export function MatchStats() {
  const { data } = useApp()

  return (
    <div className="stats-grid">
      {data.stats.map((s) => (
        <div className="card statbox" key={s.key}>
          <span>
            {s.labelTh} · {s.labelEn}
          </span>
          <b className="sports-num">{s.value}</b>
        </div>
      ))}
    </div>
  )
}

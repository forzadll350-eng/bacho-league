import type { VolleyballSet } from '../types/sports'

export function VolleyballSetScore({
  sets,
  currentSet,
}: {
  sets: VolleyballSet[]
  currentSet?: number
}) {
  return (
    <div className="sets">
      {sets.map((s) => {
        const label =
          s.completed || (currentSet != null && s.setNumber === currentSet)
            ? `${s.homePoints}–${s.awayPoints}`
            : '—'
        const isCurrent = currentSet != null && s.setNumber === currentSet && !s.completed
        return (
          <div className={`set${isCurrent ? ' current' : ''}`} key={s.setNumber}>
            <span>เซต {s.setNumber}</span>
            <b className="sports-num">{label}</b>
          </div>
        )
      })}
    </div>
  )
}

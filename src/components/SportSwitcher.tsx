import { useApp } from '../context/AppContext'
import type { SportType } from '../types/sports'

const OPTIONS: { id: SportType; label: string }[] = [
  { id: 'football', label: 'ฟุตบอล' },
  { id: 'volleyball', label: 'วอลเลย์บอล' },
]

export function SportSwitcher() {
  const { sport, setSport } = useApp()

  return (
    <div className="sport-switch" role="tablist" aria-label="เลือกชนิดกีฬา">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={sport === opt.id}
          className={sport === opt.id ? 'active' : ''}
          onClick={() => setSport(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

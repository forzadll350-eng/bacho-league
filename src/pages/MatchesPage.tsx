import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { MatchCard } from '../components/MatchCard'
import type { Match } from '../types/sports'

type GroupFilter = 'all' | 'A' | 'B' | 'knockout'

function stageLabel(m: Match) {
  if (m.stage === 'final') return 'นัดชิง'
  if (m.stage === 'semi') return 'รองฯ'
  if (m.groupCode) return `สาย ${m.groupCode}`
  return ''
}

export function MatchesPage() {
  const { page, data, fixturesTab, setFixturesTab } = useApp()
  const [groupTab, setGroupTab] = useState<GroupFilter>('all')

  const filtered = useMemo(() => {
    return data.matches.filter((m) => {
      if (fixturesTab === 'upcoming' && m.status !== 'scheduled') return false
      if (fixturesTab === 'results' && m.status !== 'finished') return false
      if (groupTab === 'A') return m.groupCode === 'A'
      if (groupTab === 'B') return m.groupCode === 'B'
      if (groupTab === 'knockout') return m.stage === 'semi' || m.stage === 'final'
      return true
    })
  }, [data.matches, fixturesTab, groupTab])

  return (
    <section className={`page${page === 'fixtures' ? ' active' : ''}`} id="page-fixtures">
      <div className="section-head">
        <div>
          <h1>การแข่งขัน</h1>
          <p>21 ก.ย. 2569 · สองสายแข่งพร้อมกันคนละสนาม</p>
        </div>
      </div>

      <div className="seg" role="tablist">
        {(
          [
            ['today', 'ทั้งหมด'],
            ['upcoming', 'ยังไม่แข่ง'],
            ['results', 'ผลแล้ว'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={fixturesTab === id ? 'active' : ''}
            aria-selected={fixturesTab === id}
            onClick={() => setFixturesTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="seg group-seg" role="tablist">
        {(
          [
            ['all', 'ทุกสาย'],
            ['A', 'สาย A'],
            ['B', 'สาย B'],
            ['knockout', 'รองฯ/ชิง'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={groupTab === id ? 'active' : ''}
            onClick={() => setGroupTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="date-title">วันนี้ • 21 ก.ย. 2569</div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
          ไม่มีรายการในหมวดนี้
        </div>
      ) : (
        filtered.map((m) => (
          <div key={m.id}>
            {(m.courtLabel || m.groupCode || m.stage) && (
              <div className="match-lane">
                {[stageLabel(m), m.courtLabel || m.venue].filter(Boolean).join(' · ')}
              </div>
            )}
            <MatchCard match={m} />
          </div>
        ))
      )}
    </section>
  )
}

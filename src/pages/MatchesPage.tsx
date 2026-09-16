import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { MatchCard } from '../components/MatchCard'
import { compareMatchOrder } from '../lib/matchOrder'

type GroupFilter = 'all' | 'A' | 'B'

export function MatchesPage() {
  const { page, data } = useApp()
  const [groupTab, setGroupTab] = useState<GroupFilter>('all')

  const filtered = useMemo(() => {
    return data.matches
      .filter((m) => {
        if (m.stage === 'semi' || m.stage === 'third' || m.stage === 'final') return false
        if (groupTab === 'A') return m.groupCode === 'A'
        if (groupTab === 'B') return m.groupCode === 'B'
        return true
      })
      .sort(compareMatchOrder)
  }, [data.matches, groupTab])

  const sections = useMemo(() => {
    if (groupTab !== 'all') {
      return [{ key: groupTab, title: null as string | null, items: filtered }]
    }
    const a = filtered.filter((m) => m.groupCode === 'A')
    const b = filtered.filter((m) => m.groupCode === 'B')
    return [
      { key: 'A', title: 'สาย A · สนาม A', items: a },
      { key: 'B', title: 'สาย B · สนาม B', items: b },
    ]
  }, [filtered, groupTab])

  return (
    <section className={`page${page === 'fixtures' ? ' active' : ''}`} id="page-fixtures">
      <div className="section-head">
        <div>
          <h1>การแข่งขัน</h1>
          <p>21 ก.ย. 2569 · สองสายแข่งพร้อมกันคนละสนาม</p>
        </div>
      </div>

      <div className="seg seg-trio" role="tablist" aria-label="เลือกสาย">
        {(
          [
            ['all', 'ทุกสาย'],
            ['A', 'สาย A'],
            ['B', 'สาย B'],
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

      {sections.every((s) => s.items.length === 0) ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>
          ไม่มีรายการในหมวดนี้ · รอบรอง/รอบชิงดูที่ตารางคะแนน
        </div>
      ) : (
        sections.map((section) =>
          section.items.length === 0 ? null : (
            <div className="fixture-block" key={section.key}>
              {section.title ? <div className="fixture-block-title">{section.title}</div> : null}
              {section.items.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          ),
        )
      )}
    </section>
  )
}

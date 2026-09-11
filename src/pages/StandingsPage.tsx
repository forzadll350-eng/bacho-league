import { useMemo, useState } from 'react'
import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { StandingsTable } from '../components/StandingsTable'

export function StandingsPage() {
  const { page, data } = useApp()
  const [groupTab, setGroupTab] = useState<'A' | 'B'>('A')

  const rows = useMemo(() => {
    const grouped = data.table.filter((r) => r.groupCode === groupTab)
    if (grouped.length) return grouped
    // fallback if group_code not yet on rows
    return data.table
  }, [data.table, groupTab])

  const lotteryHint = rows.some((r) => r.lotteryNote)

  return (
    <section className={`page${page === 'standings' ? ' active' : ''}`} id="page-standings">
      <div className="section-head">
        <div>
          <h1>ตารางคะแนน</h1>
          <p>
            {LEAGUE.seasonName} · 21 ก.ย. 2569 · เสมอกันใช้จับฉลาก
          </p>
        </div>
      </div>

      <div className="seg" role="tablist">
        <button
          type="button"
          className={groupTab === 'A' ? 'active' : ''}
          onClick={() => setGroupTab('A')}
        >
          สาย A
        </button>
        <button
          type="button"
          className={groupTab === 'B' ? 'active' : ''}
          onClick={() => setGroupTab('B')}
        >
          สาย B
        </button>
      </div>

      <StandingsTable rows={rows} />
      {lotteryHint ? (
        <p className="standings-note">มีทีมที่จัดอันดับด้วยจับฉลาก — ดูหมายเหตุที่แอดมิน</p>
      ) : (
        <p className="standings-note">คะแนนเท่ากัน → จับฉลากจัดอันดับ (ไม่ใช้ประตูได้เสีย)</p>
      )}
    </section>
  )
}

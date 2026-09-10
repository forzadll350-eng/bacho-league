import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { LiveMatchHero } from '../components/LiveMatchHero'
import { MatchCard } from '../components/MatchCard'
import { StandingsTable } from '../components/StandingsTable'

function goQuick(
  label: string,
  setPage: ReturnType<typeof useApp>['setPage'],
  setFixturesTab: ReturnType<typeof useApp>['setFixturesTab'],
) {
  if (label === 'กำลังแข่งขัน') {
    setPage('live')
    return
  }
  if (label === 'จบแล้ว') {
    setFixturesTab('results')
    setPage('fixtures')
    return
  }
  if (label === 'รอแข่งขัน') {
    setFixturesTab('upcoming')
    setPage('fixtures')
    return
  }
  if (label === 'คะแนนทีมนำ') {
    setPage('standings')
  }
}

export function HomePage() {
  const { page, data, setPage, setFixturesTab } = useApp()

  return (
    <section className={`page${page === 'home' ? ' active' : ''}`} id="page-home">
      <div className="section-head">
        <div>
          <h1>วันแข่งขัน</h1>
          <p>{data.homeSub}</p>
        </div>
        <button type="button" className="text-btn">
          {LEAGUE.seasonName}
        </button>
      </div>

      <LiveMatchHero />

      <div className="section-head">
        <h2>การแข่งขันวันนี้</h2>
        <button type="button" className="text-btn" onClick={() => setPage('fixtures')}>
          ดูทั้งหมด
        </button>
      </div>
      {data.matches.slice(0, 3).map((m) => (
        <MatchCard key={m.id} match={m} />
      ))}

      <div className="section-head">
        <h2>ตารางคะแนนสด</h2>
        <button type="button" className="text-btn" onClick={() => setPage('standings')}>
          ดูตารางเต็ม
        </button>
      </div>
      <StandingsTable rows={data.table} limit={4} />

      <div className="section-head">
        <h2>ภาพรวม</h2>
      </div>
      <div className="quick-grid">
        {data.quick.map(([value, label]) => (
          <button
            type="button"
            className="card quick quick-btn"
            key={label}
            onClick={() => goQuick(label, setPage, setFixturesTab)}
          >
            <span>{label}</span>
            <b className="sports-num">{value}</b>
          </button>
        ))}
      </div>
    </section>
  )
}

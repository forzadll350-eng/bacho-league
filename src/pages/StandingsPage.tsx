import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { StandingsTable } from '../components/StandingsTable'

export function StandingsPage() {
  const { page, data } = useApp()

  return (
    <section className={`page${page === 'standings' ? ' active' : ''}`} id="page-standings">
      <div className="section-head">
        <div>
          <h1>ตารางคะแนน</h1>
          <p>{LEAGUE.seasonName}</p>
        </div>
      </div>
      <StandingsTable rows={data.table} />
    </section>
  )
}

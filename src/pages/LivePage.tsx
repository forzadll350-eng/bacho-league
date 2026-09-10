import { useApp } from '../context/AppContext'
import { LiveMatchHero } from '../components/LiveMatchHero'
import { EventTimeline } from '../components/EventTimeline'
import { MatchStats } from '../components/MatchStats'
import { StandingsTable } from '../components/StandingsTable'

export function LivePage() {
  const { page, data, liveTab, setLiveTab } = useApp()

  return (
    <section className={`page${page === 'live' ? ' active' : ''}`} id="page-live">
      <div className="section-head">
        <div>
          <h1>การแข่งขันสด</h1>
          <p>{data.liveSub}</p>
        </div>
        <span className="status live">LIVE</span>
      </div>

      <LiveMatchHero compact />

      <div className="seg" role="tablist">
        {(
          [
            ['events', 'เหตุการณ์'],
            ['stats', 'สถิติ'],
            ['table', 'ตารางสด'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={liveTab === id ? 'active' : ''}
            aria-selected={liveTab === id}
            onClick={() => setLiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {liveTab === 'events' && <EventTimeline />}
      {liveTab === 'stats' && <MatchStats />}
      {liveTab === 'table' && <StandingsTable rows={data.table} />}
    </section>
  )
}

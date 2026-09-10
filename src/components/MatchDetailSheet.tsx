import { ChevronLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { EventTimeline } from './EventTimeline'
import { MatchStats } from './MatchStats'
import { VolleyballSetScore } from './VolleyballSetScore'

export function MatchDetailSheet() {
  const {
    sport,
    data,
    detailOpen,
    closeDetail,
    detailTab,
    setDetailTab,
  } = useApp()

  return (
    <section className={`detail${detailOpen ? ' open' : ''}`} aria-hidden={!detailOpen}>
      <div className="detail-shell">
        <div className="detail-top">
          <button className="back" type="button" aria-label="ย้อนกลับ" onClick={closeDetail}>
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <b>
            {sport === 'football'
              ? 'รายละเอียดการแข่งขันฟุตบอล'
              : 'รายละเอียดการแข่งขันวอลเลย์บอล'}
          </b>
          <div style={{ width: 38 }} />
        </div>
        <div className="detail-body">
          <div className="card detail-score">
            <small>{data.hero.league}</small>
            <div className="detail-teams">
              <div className="detail-team">
                <img src={data.hero.home.crestUrl} alt="" />
                <b>{data.hero.home.nameTh}</b>
              </div>
              <h3 className="sports-num">{data.hero.score}</h3>
              <div className="detail-team">
                <img src={data.hero.away.crestUrl} alt="" />
                <b>{data.hero.away.nameTh}</b>
              </div>
            </div>
            <p>{data.hero.state}</p>
            {sport === 'volleyball' && data.hero.sets ? (
              <VolleyballSetScore sets={data.hero.sets} currentSet={4} />
            ) : null}
          </div>

          <div className="seg" role="tablist">
            {(
              [
                ['events', 'เหตุการณ์'],
                ['stats', 'สถิติ'],
                ['lineup', 'ผู้เล่น'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className={detailTab === id ? 'active' : ''}
                aria-selected={detailTab === id}
                onClick={() => setDetailTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {detailTab === 'events' && <EventTimeline />}
          {detailTab === 'stats' && <MatchStats />}
          {detailTab === 'lineup' && (
            <div className="card lineup">
              {data.lineup.map((p) => (
                <div className="player" key={`${p.number}-${p.name}`}>
                  <div>
                    <b>
                      {p.number} • {p.name}
                    </b>
                  </div>
                  <span>{p.position}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

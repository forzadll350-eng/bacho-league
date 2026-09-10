import { useApp } from '../context/AppContext'
import type { Match } from '../types/sports'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function statusClass(m: Match) {
  if (m.status === 'live' || m.status === 'halftime') return 'live'
  if (m.status === 'finished') return 'done'
  return ''
}

export function MatchesPage() {
  const { page, data, openDetail, fixturesTab, setFixturesTab } = useApp()

  const filtered = data.matches.filter((m) => {
    if (fixturesTab === 'today') return true
    if (fixturesTab === 'upcoming') return m.status === 'scheduled'
    return m.status === 'finished'
  })

  return (
    <section className={`page${page === 'fixtures' ? ' active' : ''}`} id="page-fixtures">
      <div className="section-head">
        <div>
          <h1>การแข่งขัน</h1>
          <p>โปรแกรม ผลการแข่งขัน และคู่ถัดไป</p>
        </div>
      </div>

      <div className="seg" role="tablist">
        {(
          [
            ['today', 'วันนี้'],
            ['upcoming', 'ถัดไป'],
            ['results', 'ผลการแข่งขัน'],
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

      <div className="date-title">วันนี้ • ฤดูกาล 2569</div>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>
          ไม่มีรายการในหมวดนี้
        </div>
      ) : (
        filtered.map((m) => (
          <button
            key={m.id}
            type="button"
            className="card fixture"
            onClick={m.detail ? openDetail : undefined}
            disabled={!m.detail}
            style={m.detail ? undefined : { cursor: 'default' }}
          >
            <div className="fixture-time">{formatTime(m.scheduledAt)}</div>
            <div className="fixture-teams">
              <b>{m.homeTeam.nameTh}</b>
              <br />
              <span>{m.awayTeam.nameTh}</span>
            </div>
            {m.status === 'live' || m.status === 'finished' ? (
              <span className={`status ${statusClass(m)}`}>
                {m.status === 'live'
                  ? `สด • ${m.homeScore}–${m.awayScore}`
                  : `จบ ${m.homeScore}–${m.awayScore}`}
              </span>
            ) : (
              <div className="chev">›</div>
            )}
          </button>
        ))
      )}
    </section>
  )
}

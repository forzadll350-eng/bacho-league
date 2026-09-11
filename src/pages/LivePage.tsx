import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { LiveMatchHero } from '../components/LiveMatchHero'
import { EventTimeline } from '../components/EventTimeline'
import { MatchStats } from '../components/MatchStats'
import { StandingsTable } from '../components/StandingsTable'
import type { LiveHeroData, Match } from '../types/sports'

function pickGroupMatch(matches: Match[], group: 'A' | 'B'): Match | undefined {
  const list = matches.filter((m) => m.groupCode === group)
  return (
    list.find((m) => m.status === 'live' || m.status === 'halftime') ??
    list.find((m) => m.status === 'scheduled') ??
    list[0]
  )
}

function heroForMatch(match: Match | undefined, base: LiveHeroData, group: 'A' | 'B'): LiveHeroData {
  if (!match) {
    return {
      ...base,
      league: `${base.league} · สาย ${group}`,
      state: 'ยังไม่มีนัดในสายนี้',
      clock: `สาย ${group}`,
      score: '—',
    }
  }
  const live = match.status === 'live' || match.status === 'halftime'
  return {
    ...base,
    home: match.homeTeam,
    away: match.awayTeam,
    score: `${match.homeScore}–${match.awayScore}`,
    state:
      match.periodLabel ??
      (live ? 'กำลังแข่งขัน' : match.status === 'finished' ? 'จบแล้ว' : 'รอแข่งขัน'),
    clock: match.liveClock ?? (live ? 'LIVE' : match.courtLabel ?? `สาย ${group}`),
    liveStreamUrl: match.liveStreamUrl,
    league: [base.league.split('·')[0]?.trim() || base.league, `สาย ${group}`, match.courtLabel]
      .filter(Boolean)
      .join(' · '),
  }
}

export function LivePage() {
  const { page, data, liveTab, setLiveTab, homeGroup, setHomeGroup } = useApp()

  const featured = useMemo(
    () => pickGroupMatch(data.matches, homeGroup),
    [data.matches, homeGroup],
  )
  const hero = useMemo(
    () => heroForMatch(featured, data.hero, homeGroup),
    [featured, data.hero, homeGroup],
  )
  const isLive = featured?.status === 'live' || featured?.status === 'halftime'
  const groupTable = useMemo(
    () => data.table.filter((r) => r.groupCode === homeGroup),
    [data.table, homeGroup],
  )

  return (
    <section className={`page${page === 'live' ? ' active' : ''}`} id="page-live">
      <div className="section-head">
        <div>
          <h1>การแข่งขันสด</h1>
          <p>
            สาย {homeGroup} · {data.liveSub}
          </p>
        </div>
        {isLive ? <span className="status live">LIVE</span> : null}
      </div>

      <div className="seg group-seg" role="tablist" aria-label="เลือกสาย">
        <button
          type="button"
          className={homeGroup === 'A' ? 'active' : ''}
          onClick={() => setHomeGroup('A')}
        >
          สาย A
        </button>
        <button
          type="button"
          className={homeGroup === 'B' ? 'active' : ''}
          onClick={() => setHomeGroup('B')}
        >
          สาย B
        </button>
      </div>

      <LiveMatchHero compact hero={hero} isLive={isLive} />

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
      {liveTab === 'table' && (
        <StandingsTable rows={groupTable.length ? groupTable : data.table} />
      )}
    </section>
  )
}

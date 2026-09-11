import { useMemo } from 'react'
import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { LiveMatchHero } from '../components/LiveMatchHero'
import { MatchCard } from '../components/MatchCard'
import { StandingsTable } from '../components/StandingsTable'
import type { LiveHeroData, Match } from '../types/sports'

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

export function HomePage() {
  const { page, data, setPage, setFixturesTab, homeGroup, setHomeGroup } = useApp()

  const featured = useMemo(
    () => pickGroupMatch(data.matches, homeGroup),
    [data.matches, homeGroup],
  )
  const hero = useMemo(
    () => heroForMatch(featured, data.hero, homeGroup),
    [featured, data.hero, homeGroup],
  )
  const isLive = featured?.status === 'live' || featured?.status === 'halftime'

  const groupMatches = useMemo(
    () => data.matches.filter((m) => m.groupCode === homeGroup).slice(0, 4),
    [data.matches, homeGroup],
  )
  const groupTable = useMemo(
    () => data.table.filter((r) => r.groupCode === homeGroup),
    [data.table, homeGroup],
  )

  return (
    <section className={`page${page === 'home' ? ' active' : ''}`} id="page-home">
      <div className="section-head">
        <div>
          <h1>วันแข่งขัน</h1>
          <p>21 ก.ย. 2569 · สองสายสองสนาม</p>
        </div>
        <button type="button" className="text-btn">
          {LEAGUE.seasonName}
        </button>
      </div>

      <div className="seg group-seg" role="tablist" aria-label="เลือกสาย">
        <button
          type="button"
          className={homeGroup === 'A' ? 'active' : ''}
          aria-selected={homeGroup === 'A'}
          onClick={() => setHomeGroup('A')}
        >
          สาย A · สนาม A
        </button>
        <button
          type="button"
          className={homeGroup === 'B' ? 'active' : ''}
          aria-selected={homeGroup === 'B'}
          onClick={() => setHomeGroup('B')}
        >
          สาย B · สนาม B
        </button>
      </div>

      <LiveMatchHero hero={hero} isLive={isLive} />

      <div className="section-head">
        <h2>การแข่งขันสาย {homeGroup}</h2>
        <button type="button" className="text-btn" onClick={() => setPage('fixtures')}>
          ดูทั้งหมด
        </button>
      </div>
      {groupMatches.length === 0 ? (
        <div className="card" style={{ padding: 14, color: 'var(--muted)', fontSize: 12 }}>
          ยังไม่มีนัดในสายนี้
        </div>
      ) : (
        groupMatches.map((m) => <MatchCard key={m.id} match={m} />)
      )}

      <div className="section-head">
        <h2>ตารางคะแนนสาย {homeGroup}</h2>
        <button type="button" className="text-btn" onClick={() => setPage('standings')}>
          ดูตารางเต็ม
        </button>
      </div>
      <StandingsTable rows={groupTable.length ? groupTable : data.table} limit={4} />

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

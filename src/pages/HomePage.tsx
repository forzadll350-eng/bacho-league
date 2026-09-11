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
) {
  if (label === 'จบแล้ว' || label === 'รอแข่งขัน') {
    setPage('fixtures')
    return
  }
  if (label === 'คะแนนทีมนำ' || label === 'ประตูรวม') {
    setPage('standings')
  }
}

function formatClock(match: Match) {
  const start = new Date(match.scheduledAt).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!match.endsAt) return start
  const end = new Date(match.endsAt).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${start}–${end}`
}

function pickGroupMatch(matches: Match[], group: 'A' | 'B'): Match | undefined {
  const list = matches.filter((m) => m.groupCode === group)
  return (
    list.find((m) => m.status === 'live' || m.status === 'halftime') ??
    list.find((m) => m.status === 'scheduled') ??
    list.find((m) => m.status === 'finished') ??
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
      sets: undefined,
      stats: [],
    }
  }
  const playing = match.status === 'live' || match.status === 'halftime'
  const { sets: _ignore, ...rest } = base
  return {
    ...rest,
    home: match.homeTeam,
    away: match.awayTeam,
    score: `${match.homeScore} - ${match.awayScore}`,
    state:
      match.periodLabel ??
      (playing ? 'กำลังแข่ง' : match.status === 'finished' ? 'จบแล้ว' : 'รอแข่งขัน'),
    clock: formatClock(match),
    liveStreamUrl: undefined,
    league: [base.league.split('·')[0]?.trim() || base.league, `สาย ${group}`, match.courtLabel]
      .filter(Boolean)
      .join(' · '),
    sets: undefined,
    stats:
      match.sport === 'volleyball'
        ? ([
            [`${match.homeScore} - ${match.awayScore}`, 'เซต'],
            [match.periodLabel ?? '—', 'สถานะ'],
            ['15', 'แต้มต่อเซต'],
          ] as [string, string][])
        : [],
  }
}

export function HomePage() {
  const { page, data, sport, setPage, homeGroup, setHomeGroup } = useApp()

  const featured = useMemo(
    () => pickGroupMatch(data.matches, homeGroup),
    [data.matches, homeGroup],
  )
  const hero = useMemo(
    () => heroForMatch(featured, data.hero, homeGroup),
    [featured, data.hero, homeGroup],
  )
  const isPlaying = featured?.status === 'live' || featured?.status === 'halftime'

  const groupMatches = useMemo(
    () =>
      data.matches
        .filter((m) => m.groupCode === homeGroup && m.stage === 'group')
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)),
    [data.matches, homeGroup],
  )
  const groupTable = useMemo(
    () => data.table.filter((r) => r.groupCode === homeGroup),
    [data.table, homeGroup],
  )
  const topScorer = data.topScorers[0]

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

      <div className="seg seg-duo" role="tablist" aria-label="เลือกสาย">
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

      <LiveMatchHero
        hero={hero}
        isLive={isPlaying}
        goals={featured?.goals}
        homeTeamId={featured?.homeTeam.id}
        matchId={featured?.id}
        matchStatus={featured?.status}
        scheduledAt={featured?.scheduledAt}
      />

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

      {sport === 'football' ? (
        <>
          <div className="section-head">
            <h2>ดาวซัลโว</h2>
          </div>
          <div className="card top-scorer-card">
            {topScorer ? (
              <div className="top-scorer-row">
                {topScorer.photoUrl ? (
                  <img src={topScorer.photoUrl} alt="" className="top-scorer-photo" />
                ) : (
                  <div className="top-scorer-badge">#{topScorer.jerseyNumber}</div>
                )}
                <div>
                  <b>
                    {topScorer.playerName ?? `เบอร์ ${topScorer.jerseyNumber}`}
                  </b>
                  <p>
                    {topScorer.teamName} · {topScorer.goals} ประตู
                  </p>
                </div>
              </div>
            ) : (
              <p className="lt-empty">ยังไม่มีผู้ยิง — แอดมินจะบันทึกเบอร์เสื้อหลังแข่ง</p>
            )}
          </div>

          <button type="button" className="card menu-cta vote-cta" onClick={() => setPage('vote')}>
            <div>
              <div className="menu-title">โหวตนักกีฬาขวัญใจ อำเภอบาเจาะ</div>
              <div className="menu-sub">เลือกได้ 1 คน · จากรายชื่อที่ลงทะเบียนฟุตซอล</div>
            </div>
            <div className="chev">›</div>
          </button>
        </>
      ) : null}

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
            onClick={() => goQuick(label, setPage)}
          >
            <span>{label}</span>
            <b className="sports-num">{value}</b>
          </button>
        ))}
      </div>
    </section>
  )
}

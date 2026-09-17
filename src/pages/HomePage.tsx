import { useMemo } from 'react'
import { LEAGUE } from '../data/teams'
import { useApp } from '../context/AppContext'
import { LiveMatchHero } from '../components/LiveMatchHero'
import { MatchCard } from '../components/MatchCard'
import { StandingsTable } from '../components/StandingsTable'
import type { LiveHeroData, Match } from '../types/sports'
import { compareMatchOrder, matchOrderLabel } from '../lib/matchOrder'

type HomeView = 'A' | 'B' | 'knockout'

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

function isKnockoutMatch(match: Match, sport: Match['sport']): boolean {
  return (
    match.stage === 'final' ||
    (sport === 'football' && (match.stage === 'semi' || match.stage === 'third'))
  )
}

function pickHomeMatch(
  matches: Match[],
  view: HomeView,
  sport: Match['sport'],
): Match | undefined {
  const list = matches
    .filter((match) =>
      view === 'knockout'
        ? isKnockoutMatch(match, sport)
        : match.groupCode === view && match.stage === 'group',
    )
    .sort(compareMatchOrder)

  const finished = list.filter((match) => match.status === 'finished')
  return (
    list.find((m) => m.status === 'live' || m.status === 'halftime') ??
    list.find((m) => m.status === 'scheduled') ??
    (view === 'knockout' ? finished.at(-1) : finished[0]) ??
    list[0]
  )
}

function knockoutLabel(match: Match | undefined, sport: Match['sport']): string {
  if (match?.stage === 'final' || sport === 'volleyball') return 'รอบชิงชนะเลิศ'
  if (match?.stage === 'third') return 'ชิงอันดับ 3'
  if (match?.stage === 'semi') return 'รอบรองชนะเลิศ'
  return 'รอบรอง / รอบชิง'
}

function heroForMatch(
  match: Match | undefined,
  base: LiveHeroData,
  view: HomeView,
  sport: Match['sport'],
): LiveHeroData {
  const viewLabel = view === 'knockout' ? knockoutLabel(match, sport) : `สาย ${view}`
  if (!match) {
    return {
      ...base,
      league: `${base.league} · ${viewLabel}`,
      state: view === 'knockout' ? 'ยังไม่มีการแข่งขันรอบนี้' : 'ยังไม่มีนัดในสายนี้',
      clock: viewLabel,
      score: '—',
      sets: undefined,
      pointsScore: undefined,
      pointsSetLabel: undefined,
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
    pointsScore:
      match.sport === 'volleyball'
        ? `${match.homePoints ?? 0} - ${match.awayPoints ?? 0}`
        : undefined,
    pointsSetLabel: match.sport === 'volleyball' ? `เซต ${match.pointsSet ?? 1}` : undefined,
    state:
      match.periodLabel ??
      (playing ? 'กำลังแข่งขัน' : match.status === 'finished' ? 'จบแล้ว' : 'รอแข่งขัน'),
    clock: match.hideScheduleTime ? matchOrderLabel(match) : formatClock(match),
    league: [base.league.split('·')[0]?.trim() || base.league, viewLabel, match.courtLabel]
      .filter(Boolean)
      .join(' · '),
    sets: undefined,
    stats:
      match.sport === 'volleyball'
        ? ([
            [`${match.homeScore} - ${match.awayScore}`, 'เซต'],
            [`${match.homePoints ?? 0} - ${match.awayPoints ?? 0}`, `เซต ${match.pointsSet ?? 1}`],
            [match.periodLabel ?? '—', 'สถานะ'],
          ] as [string, string][])
        : [],
  }
}

export function HomePage() {
  const { page, data, sport, setPage, homeGroup, setHomeGroup } = useApp()

  const knockoutMatches = useMemo(
    () => data.matches.filter((match) => isKnockoutMatch(match, sport)).sort(compareMatchOrder),
    [data.matches, sport],
  )
  const liveKnockout = knockoutMatches.find(
    (match) => match.status === 'live' || match.status === 'halftime',
  )
  const activeView: HomeView = liveKnockout ? 'knockout' : homeGroup

  const featured = useMemo(
    () => pickHomeMatch(data.matches, activeView, sport),
    [data.matches, activeView, sport],
  )
  const hero = useMemo(
    () => heroForMatch(featured, data.hero, activeView, sport),
    [featured, data.hero, activeView, sport],
  )
  const isPlaying = featured?.status === 'live' || featured?.status === 'halftime'

  const homeMatches = useMemo(() => {
    if (activeView === 'knockout') return knockoutMatches
    return data.matches
      .filter((match) => match.groupCode === activeView && match.stage === 'group')
      .sort(compareMatchOrder)
  }, [activeView, data.matches, knockoutMatches])
  const groupTable = useMemo(
    () =>
      activeView === 'knockout'
        ? []
        : data.table.filter((row) => row.groupCode === activeView),
    [activeView, data.table],
  )
  const topScorer = data.topScorers[0]
  const knockoutTabLabel = sport === 'football' ? 'รอบน็อคเอาต์' : 'รอบชิง'
  const matchSectionTitle =
    activeView === 'knockout'
      ? sport === 'football'
        ? 'รอบรอง ชิงอันดับ 3 และชิงชนะเลิศ'
        : 'รอบชิงชนะเลิศ'
      : `การแข่งขันสาย ${activeView}`

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

      <div className="seg seg-trio" role="tablist" aria-label="เลือกรอบการแข่งขัน">
        <button
          type="button"
          className={activeView === 'A' ? 'active' : ''}
          aria-selected={activeView === 'A'}
          onClick={() => setHomeGroup('A')}
        >
          สาย A · สนาม A
        </button>
        <button
          type="button"
          className={activeView === 'B' ? 'active' : ''}
          aria-selected={activeView === 'B'}
          onClick={() => setHomeGroup('B')}
        >
          สาย B · สนาม B
        </button>
        <button
          type="button"
          className={activeView === 'knockout' ? 'active' : ''}
          aria-selected={activeView === 'knockout'}
          onClick={() => setHomeGroup('knockout')}
        >
          {knockoutTabLabel}
        </button>
      </div>

      <LiveMatchHero
        hero={hero}
        isLive={isPlaying}
        goals={featured?.goals}
        homeTeamId={featured?.homeTeam.id}
        matchId={featured?.id}
        matchStatus={featured?.status}
        startedAt={featured?.startedAt}
        hideScheduleTime={featured?.hideScheduleTime}
        matchOrder={featured?.matchOrder}
      />

      <div className="section-head">
        <h2>{matchSectionTitle}</h2>
        <button
          type="button"
          className="text-btn"
          onClick={() => setPage(activeView === 'knockout' ? 'standings' : 'fixtures')}
        >
          ดูทั้งหมด
        </button>
      </div>
      {homeMatches.length === 0 ? (
        <div className="card" style={{ padding: 14, color: 'var(--muted)', fontSize: 12 }}>
          {activeView === 'knockout' ? 'ยังไม่มีการแข่งขันรอบนี้' : 'ยังไม่มีนัดในสายนี้'}
        </div>
      ) : (
        homeMatches.map((m) => <MatchCard key={m.id} match={m} />)
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
              <p className="lt-empty">ยังไม่มีผู้ยิง</p>
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

      {activeView !== 'knockout' ? (
        <>
          <div className="section-head">
            <h2>ตารางคะแนนสาย {activeView}</h2>
            <button type="button" className="text-btn" onClick={() => setPage('standings')}>
              ดูตารางเต็ม
            </button>
          </div>
          <StandingsTable rows={groupTable} limit={4} sport={sport} />
        </>
      ) : null}

      <button
        type="button"
        className="card menu-cta evaluation-menu-cta"
        onClick={() => setPage('evaluation')}
      >
        <div>
          <div className="menu-title">ประเมินการจัดโครงการ</div>
          <div className="menu-sub">เปิด 21 ก.ย. 2569 เวลา 08:00 น. · ไม่ต้องกรอกชื่อ</div>
        </div>
        <div className="chev">›</div>
      </button>

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

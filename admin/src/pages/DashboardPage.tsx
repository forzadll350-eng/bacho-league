import { LogOut, Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLeadPoints, fetchMatches, teamName } from '../api/matches'
import { useAuth } from '../context/AuthContext'
import type { MatchRow, SportType, StatusFilter, ThemeMode } from '../types'
import { SPORT_LABELS, STATUS_LABELS } from '../types'
import { MatchEditorPage } from './MatchEditorPage'

type GroupFilter = 'all' | 'A' | 'B' | 'knockout'

type MatchSection = {
  key: string
  title: string
  subtitle?: string
  matches: MatchRow[]
}

function badgeClass(status: MatchRow['status']): string {
  if (status === 'live' || status === 'halftime') return 'badge live'
  if (status === 'finished') return 'badge finished'
  if (status === 'scheduled') return 'badge scheduled'
  return 'badge'
}

function matchesFilter(m: MatchRow, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'live') return m.status === 'live' || m.status === 'halftime'
  if (filter === 'finished') return m.status === 'finished'
  return m.status === 'scheduled'
}

function sectionBucket(m: MatchRow): 'A' | 'B' | 'knockout' {
  if (m.group_code === 'A') return 'A'
  if (m.group_code === 'B') return 'B'
  return 'knockout'
}

function matchOrderKey(m: MatchRow): number {
  const fromId = m.id.match(/(\d+)\s*$/)
  if (fromId) return Number(fromId[1])
  const fromLabel = m.period_label?.match(/นัดที่\s*(\d+)/)
  if (fromLabel) return Number(fromLabel[1])
  return Number(new Date(m.scheduled_at).getTime()) || 0
}

function sortMatches(list: MatchRow[]): MatchRow[] {
  return list.slice().sort((a, b) => {
    const ta = +new Date(a.scheduled_at)
    const tb = +new Date(b.scheduled_at)
    if (ta !== tb) return ta - tb
    return matchOrderKey(a) - matchOrderKey(b)
  })
}

function buildSections(matches: MatchRow[], groupFilter: GroupFilter): MatchSection[] {
  const sorted = sortMatches(matches)
  const buckets: Record<'A' | 'B' | 'knockout', MatchRow[]> = {
    A: [],
    B: [],
    knockout: [],
  }
  for (const m of sorted) {
    buckets[sectionBucket(m)].push(m)
  }

  const courtOf = (list: MatchRow[]) => {
    const courts = [...new Set(list.map((m) => m.court_label).filter(Boolean))]
    return courts.length ? courts.join(' · ') : undefined
  }

  const defs: { key: GroupFilter; title: string; list: MatchRow[] }[] = [
    { key: 'A', title: 'สาย A', list: buckets.A },
    { key: 'B', title: 'สาย B', list: buckets.B },
    {
      key: 'knockout',
      title: 'รอบชิง / น็อคเอาต์',
      list: buckets.knockout,
    },
  ]

  return defs
    .filter((d) => (groupFilter === 'all' ? d.list.length > 0 : d.key === groupFilter))
    .map((d) => ({
      key: d.key,
      title: d.title,
      subtitle: courtOf(d.list),
      matches: d.list,
    }))
}

function formatSchedule(m: MatchRow): string {
  if (m.hide_schedule_time) return 'กำลังแข่ง'
  const d = new Date(m.scheduled_at)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DashboardPage({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode
  onToggleTheme: () => void
}) {
  const { displayName, signOut } = useAuth()
  const [sport, setSport] = useState<SportType>('football')
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [leadPoints, setLeadPoints] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rows, lead] = await Promise.all([fetchMatches(sport), fetchLeadPoints(sport)])
      setMatches(rows)
      setLeadPoints(lead)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }, [sport])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    let live = 0
    let finished = 0
    let scheduled = 0
    for (const m of matches) {
      if (statusInGroup(m, groupFilter) === false) continue
      if (m.status === 'live' || m.status === 'halftime') live += 1
      else if (m.status === 'finished') finished += 1
      else if (m.status === 'scheduled') scheduled += 1
    }
    return { live, finished, scheduled }
  }, [matches, groupFilter])

  const groupCounts = useMemo(() => {
    let A = 0
    let B = 0
    let knockout = 0
    for (const m of matches) {
      const b = sectionBucket(m)
      if (b === 'A') A += 1
      else if (b === 'B') B += 1
      else knockout += 1
    }
    return { A, B, knockout }
  }, [matches])

  const sections = useMemo(() => {
    const byGroup = matches.filter((m) => {
      if (!matchesFilter(m, filter)) return false
      if (groupFilter === 'all') return true
      return sectionBucket(m) === groupFilter
    })
    return buildSections(byGroup, groupFilter === 'all' ? 'all' : groupFilter)
  }, [matches, filter, groupFilter])

  if (editingId) {
    return (
      <div className="app">
        <MatchEditorPage
          matchId={editingId}
          onBack={() => {
            setEditingId(null)
            void load()
          }}
        />
      </div>
    )
  }

  const totalVisible = sections.reduce((n, s) => n + s.matches.length, 0)

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>แอดมิน · {SPORT_LABELS[sport]}</strong>
          <span>{displayName}</span>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button type="button" className="icon-btn" onClick={() => void signOut()} aria-label="ออกจากระบบ">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="sport-toggle" role="tablist" aria-label="เลือกชนิดกีฬา">
        {(['football', 'volleyball'] as SportType[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={sport === s}
            className={sport === s ? 'active' : ''}
            onClick={() => {
              setSport(s)
              setFilter('all')
              setGroupFilter('all')
            }}
          >
            {SPORT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="group-toggle" role="tablist" aria-label="เลือกสาย">
        {(
          [
            { key: 'all' as const, label: 'ทั้งหมด', count: matches.length },
            { key: 'A' as const, label: 'สาย A', count: groupCounts.A },
            { key: 'B' as const, label: 'สาย B', count: groupCounts.B },
            { key: 'knockout' as const, label: 'รอบชิง', count: groupCounts.knockout },
          ] as const
        ).map((g) =>
          g.count === 0 && g.key !== 'all' ? null : (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={groupFilter === g.key}
              className={groupFilter === g.key ? 'active' : ''}
              onClick={() => setGroupFilter(g.key)}
            >
              {g.label}
              <span className="group-count">{g.count}</span>
            </button>
          ),
        )}
      </div>

      <div className="card-grid">
        <button
          type="button"
          className={`stat-card live${filter === 'live' ? ' active' : ''}`}
          onClick={() => setFilter((f) => (f === 'live' ? 'all' : 'live'))}
        >
          <span className="label">กำลังแข่ง</span>
          <span className="value">{counts.live}</span>
        </button>
        <button
          type="button"
          className={`stat-card${filter === 'finished' ? ' active' : ''}`}
          onClick={() => setFilter((f) => (f === 'finished' ? 'all' : 'finished'))}
        >
          <span className="label">จบแล้ว</span>
          <span className="value">{counts.finished}</span>
        </button>
        <button
          type="button"
          className={`stat-card${filter === 'scheduled' ? ' active' : ''}`}
          onClick={() => setFilter((f) => (f === 'scheduled' ? 'all' : 'scheduled'))}
        >
          <span className="label">รอแข่ง</span>
          <span className="value">{counts.scheduled}</span>
        </button>
        <button type="button" className="stat-card" onClick={() => setFilter('all')}>
          <span className="label">คะแนนนำ</span>
          <span className="value">{leadPoints ?? '—'}</span>
        </button>
      </div>

      {loading && <div className="loading">กำลังโหลดแมตช์…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && totalVisible === 0 && (
        <div className="empty">ไม่มีแมตช์ในตัวกรองนี้</div>
      )}

      <div className="match-sections">
        {sections.map((section) => (
          <section key={section.key} className="match-section">
            <div className="match-section-head">
              <div>
                <h2>{section.title}</h2>
                {section.subtitle ? <p>{section.subtitle}</p> : null}
              </div>
              <span className="match-section-count">{section.matches.length} นัด</span>
            </div>
            <div className="match-list">
              {section.matches.map((m, index) => (
                <button
                  key={m.id}
                  type="button"
                  className="match-row"
                  onClick={() => setEditingId(m.id)}
                >
                  <div className="match-ord">
                    <span className="match-ord-num">{index + 1}</span>
                  </div>
                  <div className="teams">
                    <div className="team-line">
                      <span>{teamName(m.home)}</span>
                      <span className="score">
                        {m.home_score}
                        {m.sport === 'volleyball' ? (
                          <span className="score-points">
                            ส{m.points_set ?? 1} {m.home_points ?? 0}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="team-line">
                      <span>{teamName(m.away)}</span>
                      <span className="score">
                        {m.away_score}
                        {m.sport === 'volleyball' ? (
                          <span className="score-points">
                            ส{m.points_set ?? 1} {m.away_points ?? 0}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {m.period_label ? (
                      <div className="match-round">{m.period_label}</div>
                    ) : null}
                  </div>
                  <div className="meta">
                    <span className={badgeClass(m.status)}>{STATUS_LABELS[m.status]}</span>
                    <span className="clock">
                      {[formatSchedule(m), m.court_label].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

/** Keep counts in sync with group filter; returns false when excluded */
function statusInGroup(m: MatchRow, groupFilter: GroupFilter): boolean {
  if (groupFilter === 'all') return true
  return sectionBucket(m) === groupFilter
}

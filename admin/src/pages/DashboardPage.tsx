import { LogOut, Moon, Sun } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchLeadPoints, fetchMatches, teamName } from '../api/matches'
import { useAuth } from '../context/AuthContext'
import type { MatchRow, SportType, StatusFilter, ThemeMode } from '../types'
import { SPORT_LABELS, STATUS_LABELS } from '../types'
import { MatchEditorPage } from './MatchEditorPage'

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

export function DashboardPage({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode
  onToggleTheme: () => void
}) {
  const { user, signOut } = useAuth()
  const [sport, setSport] = useState<SportType>('football')
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
      if (m.status === 'live' || m.status === 'halftime') live += 1
      else if (m.status === 'finished') finished += 1
      else if (m.status === 'scheduled') scheduled += 1
    }
    return { live, finished, scheduled }
  }, [matches])

  const visible = useMemo(
    () => matches.filter((m) => matchesFilter(m, filter)),
    [matches, filter],
  )

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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>แอดมิน · ฟุตซอลลีก</strong>
          <span>{user?.email ?? 'ผู้ดูแลระบบ'}</span>
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

      <div className="sport-toggle">
        {(['football', 'volleyball'] as SportType[]).map((s) => (
          <button
            key={s}
            type="button"
            className={sport === s ? 'active' : ''}
            onClick={() => {
              setSport(s)
              setFilter('all')
            }}
          >
            {SPORT_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card-grid">
        <button
          type="button"
          className={`stat-card live${filter === 'live' ? ' active' : ''}`}
          onClick={() => setFilter((f) => (f === 'live' ? 'all' : 'live'))}
        >
          <span className="label">ถ่ายทอดสด</span>
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
          <span className="label">กำหนดการ</span>
          <span className="value">{counts.scheduled}</span>
        </button>
        <button type="button" className="stat-card" onClick={() => setFilter('all')}>
          <span className="label">คะแนนนำ</span>
          <span className="value">{leadPoints ?? '—'}</span>
        </button>
      </div>

      {loading && <div className="loading">กำลังโหลดแมตช์…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="empty">ไม่มีแมตช์ในตัวกรองนี้</div>
      )}

      <div className="match-list">
        {visible.map((m) => (
          <button key={m.id} type="button" className="match-row" onClick={() => setEditingId(m.id)}>
            <div className="teams">
              <div className="team-line">
                <span>{teamName(m.home)}</span>
                <span className="score">{m.home_score}</span>
              </div>
              <div className="team-line">
                <span>{teamName(m.away)}</span>
                <span className="score">{m.away_score}</span>
              </div>
            </div>
            <div className="meta">
              <span className={badgeClass(m.status)}>{STATUS_LABELS[m.status]}</span>
              {(m.live_clock || m.period_label) && (
                <span className="clock">
                  {[m.period_label, m.live_clock].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

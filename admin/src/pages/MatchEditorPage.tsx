import { Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchMatch,
  fetchMatchGoals,
  replaceMatchGoals,
  teamName,
  updateMatch,
  type GoalDraft,
} from '../api/matches'
import { fetchRegistrations, type RegistrationRow } from '../api/registrations'
import type { MatchRow, MatchStatus } from '../types'
import { STATUS_LABELS } from '../types'

const STATUSES: MatchStatus[] = ['scheduled', 'finished', 'postponed', 'cancelled']

type Props = {
  matchId: string
  onBack: () => void
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function MatchEditorPage({ matchId, onBack }: Props) {
  const [match, setMatch] = useState<MatchRow | null>(null)
  const [regs, setRegs] = useState<RegistrationRow[]>([])
  const [status, setStatus] = useState<MatchStatus>('scheduled')
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [periodLabel, setPeriodLabel] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [goals, setGoals] = useState<GoalDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchMatch(matchId), fetchMatchGoals(matchId)])
      .then(async ([row, goalRows]) => {
        if (cancelled) return
        setMatch(row)
        setStatus(row.status === 'live' || row.status === 'halftime' ? 'scheduled' : row.status)
        setHomeScore(row.home_score)
        setAwayScore(row.away_score)
        setPeriodLabel(row.period_label ?? '')
        setScheduledAt(toLocalInput(row.scheduled_at))
        setEndsAt(toLocalInput(row.ends_at))
        setGoals(
          goalRows.map((g) => ({
            id: g.id,
            team_id: g.team_id,
            jersey_number: g.jersey_number,
            minute_approx: g.minute_approx,
            player_name: g.player_name,
            registration_id: g.registration_id,
          })),
        )
        try {
          const list = await fetchRegistrations(row.sport)
          if (!cancelled) {
            setRegs(
              list.filter(
                (r) => r.team_id === row.home_team_id || r.team_id === row.away_team_id,
              ),
            )
          }
        } catch {
          if (!cancelled) setRegs([])
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'โหลดแมตช์ไม่สำเร็จ')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [matchId])

  const teamOptions = useMemo(() => {
    if (!match) return []
    return [
      { id: match.home_team_id, label: teamName(match.home) },
      { id: match.away_team_id, label: teamName(match.away) },
    ]
  }, [match])

  function addGoal() {
    if (!match) return
    setGoals((prev) => [
      ...prev,
      {
        team_id: match.home_team_id,
        jersey_number: '',
        minute_approx: null,
        player_name: null,
        registration_id: null,
      },
    ])
  }

  function updateGoal(index: number, patch: Partial<GoalDraft>) {
    setGoals((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  function removeGoal(index: number) {
    setGoals((prev) => prev.filter((_, i) => i !== index))
  }

  async function save() {
    if (!match) return
    const startIso = fromLocalInput(scheduledAt)
    if (!startIso) {
      setError('กรุณาตั้งเวลาเริ่มแข่ง')
      return
    }
    setSaving(true)
    setToast(null)
    setError(null)
    try {
      await updateMatch(matchId, {
        status,
        home_score: homeScore,
        away_score: awayScore,
        live_clock: null,
        period_label: periodLabel.trim() || null,
        live_stream_url: null,
        scheduled_at: startIso,
        ends_at: fromLocalInput(endsAt),
        updated_at: new Date().toISOString(),
      })
      if (match.sport === 'football') {
        await replaceMatchGoals(
          matchId,
          goals.filter((g) => g.jersey_number.trim()),
        )
      }
      setToast('บันทึกแล้ว')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading">กำลังโหลดแมตช์…</div>
  if (error && !match) return <div className="error">{error}</div>
  if (!match) return <div className="empty">ไม่พบแมตช์</div>

  return (
    <div>
      <div className="editor-header">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← กลับ
        </button>
        <h2>แก้ไขแมตช์</h2>
      </div>

      <div className="editor-panel">
        <div className="field">
          <label htmlFor="start">เริ่มแข่ง</label>
          <input
            id="start"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="end">จบประมาณ (ถ้ามี)</label>
          <input
            id="end"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      <div className="editor-panel">
        <div className="editor-title">สกอร์</div>
        <div className="score-edit">
          <div className="score-side">
            <div className="name">{teamName(match.home)}</div>
            <div className="big">{homeScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => setHomeScore((n) => Math.max(0, n - 1))}>
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => setHomeScore((n) => n + 1)}>
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="vs">VS</div>
          <div className="score-side">
            <div className="name">{teamName(match.away)}</div>
            <div className="big">{awayScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => setAwayScore((n) => Math.max(0, n - 1))}>
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => setAwayScore((n) => n + 1)}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="editor-panel">
        <div className="field">
          <label htmlFor="status">สถานะ</label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value as MatchStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="period">หมายเหตุช่วง (ถ้ามี)</label>
          <input
            id="period"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="เช่น ครึ่งแรก · เซต 2"
          />
        </div>
      </div>

      {match.sport === 'football' ? (
        <div className="editor-panel">
          <div className="editor-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>ผู้ยิง (เบอร์เสื้อ)</span>
            <button type="button" className="btn ghost" onClick={addGoal}>
              + เพิ่ม
            </button>
          </div>
          {goals.length === 0 ? (
            <p className="field-hint">ยังไม่มีรายการ · นาทีใส่หรือไม่ก็ได้</p>
          ) : (
            goals.map((g, index) => (
              <div className="goal-edit-row" key={g.id ?? index}>
                <select
                  value={g.team_id}
                  onChange={(e) => updateGoal(index, { team_id: e.target.value, registration_id: null })}
                >
                  {teamOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  value={g.jersey_number}
                  onChange={(e) => updateGoal(index, { jersey_number: e.target.value })}
                  placeholder="เบอร์"
                />
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={g.minute_approx ?? ''}
                  onChange={(e) =>
                    updateGoal(index, {
                      minute_approx: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="นาที~"
                />
                <select
                  value={g.registration_id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value || null
                    const reg = regs.find((r) => r.id === id)
                    updateGoal(index, {
                      registration_id: id,
                      player_name: reg?.full_name ?? g.player_name,
                      jersey_number: reg?.jersey_number || g.jersey_number,
                      team_id: reg?.team_id ?? g.team_id,
                    })
                  }}
                >
                  <option value="">ผูกทะเบียน (ถ้ามี)</option>
                  {regs
                    .filter((r) => r.team_id === g.team_id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.jersey_number ? `#${r.jersey_number} ` : ''}
                        {r.full_name}
                      </option>
                    ))}
                </select>
                <button type="button" className="btn ghost" onClick={() => removeGoal(index)} aria-label="ลบ">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={saving}>
          ยกเลิก
        </button>
        <button type="button" className="btn" onClick={() => void save()} disabled={saving}>
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {error && <div className="toast err">{error}</div>}
    </div>
  )
}

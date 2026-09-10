import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchMatch, teamName, updateMatch } from '../api/matches'
import type { MatchRow, MatchStatus } from '../types'
import { STATUS_LABELS } from '../types'

const STATUSES: MatchStatus[] = [
  'scheduled',
  'live',
  'halftime',
  'finished',
  'postponed',
  'cancelled',
]

type Props = {
  matchId: string
  onBack: () => void
}

export function MatchEditorPage({ matchId, onBack }: Props) {
  const [match, setMatch] = useState<MatchRow | null>(null)
  const [status, setStatus] = useState<MatchStatus>('scheduled')
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [liveClock, setLiveClock] = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchMatch(matchId)
      .then((row) => {
        if (cancelled) return
        setMatch(row)
        setStatus(row.status)
        setHomeScore(row.home_score)
        setAwayScore(row.away_score)
        setLiveClock(row.live_clock ?? '')
        setPeriodLabel(row.period_label ?? '')
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

  async function save() {
    setSaving(true)
    setToast(null)
    setError(null)
    try {
      await updateMatch(matchId, {
        status,
        home_score: homeScore,
        away_score: awayScore,
        live_clock: liveClock.trim() || null,
        period_label: periodLabel.trim() || null,
        updated_at: new Date().toISOString(),
      })
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
        <div className="editor-title">สกอร์</div>
        <div className="score-edit">
          <div className="score-side">
            <div className="name">{teamName(match.home)}</div>
            <div className="big">{homeScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => setHomeScore((n) => Math.max(0, n - 1))} aria-label="ลดสกอร์เจ้าบ้าน">
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => setHomeScore((n) => n + 1)} aria-label="เพิ่มสกอร์เจ้าบ้าน">
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="vs">VS</div>
          <div className="score-side">
            <div className="name">{teamName(match.away)}</div>
            <div className="big">{awayScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => setAwayScore((n) => Math.max(0, n - 1))} aria-label="ลดสกอร์ทีมเยือน">
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => setAwayScore((n) => n + 1)} aria-label="เพิ่มสกอร์ทีมเยือน">
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
        <div className="field">
          <label htmlFor="clock">นาฬิกาถ่ายทอด (live_clock)</label>
          <input
            id="clock"
            value={liveClock}
            onChange={(e) => setLiveClock(e.target.value)}
            placeholder="เช่น 67′ หรือ Q3 4:12"
          />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="period">ช่วงเวลา (period_label)</label>
          <input
            id="period"
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            placeholder="เช่น ครึ่งหลัง · เซ็ต 2"
          />
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn secondary" onClick={onBack} disabled={saving}>
          ยกเลิก
        </button>
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
      {error && <div className="toast err">{error}</div>}
    </div>
  )
}

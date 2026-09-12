import { Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchMatch,
  fetchMatchGoals,
  fetchMatches,
  saveMatchState,
  teamName,
  type GoalDraft,
} from '../api/matches'
import { fetchRegistrations, type RegistrationRow } from '../api/registrations'
import {
  clampSetNumber,
  readSetPair,
  writeSetPair,
  type SetNumber,
  type SetScoresMap,
} from '../lib/volleyballSets'
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

/** นาทีเดียวกับนาฬิกาหน้าหลัก: นับจากเวลาเริ่มแข่ง */
function matchMinuteFromKickoff(startedIso: string | null): number {
  if (!startedIso) return 0
  const start = new Date(startedIso).getTime()
  if (Number.isNaN(start)) return 0
  const elapsed = Math.max(0, Math.floor((Date.now() - start) / 60000))
  return Math.min(elapsed, 120)
}

function jerseyKey(value: string | null | undefined): string {
  const t = (value ?? '').trim()
  if (!t) return ''
  if (/^\d+$/.test(t)) return String(Number(t))
  return t
}

function sortJersey(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
  return a.localeCompare(b, 'th')
}

export function MatchEditorPage({ matchId, onBack }: Props) {
  const [match, setMatch] = useState<MatchRow | null>(null)
  const [regs, setRegs] = useState<RegistrationRow[]>([])
  const [status, setStatus] = useState<MatchStatus>('scheduled')
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [homePoints, setHomePoints] = useState(0)
  const [awayPoints, setAwayPoints] = useState(0)
  const [pointsSet, setPointsSet] = useState<SetNumber>(1)
  const [setScores, setSetScores] = useState<SetScoresMap>({})
  const [periodLabel, setPeriodLabel] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [endsAt, setEndsAt] = useState('')
  const [hideScheduleTime, setHideScheduleTime] = useState(false)
  const [matchOrder, setMatchOrder] = useState('1')
  const [matchOrderLimit, setMatchOrderLimit] = useState(1)
  const [goals, setGoals] = useState<GoalDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setClockNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchMatch(matchId), fetchMatchGoals(matchId)])
      .then(async ([row, goalRows]) => {
        if (cancelled) return
        setMatch(row)
        setStatus(row.status)
        setHomeScore(row.home_score)
        setAwayScore(row.away_score)
        setHomePoints(row.home_points ?? 0)
        setAwayPoints(row.away_points ?? 0)
        setPointsSet(clampSetNumber(row.points_set))
        setSetScores((row.set_scores as SetScoresMap) ?? {})
        setPeriodLabel(row.period_label ?? '')
        setScheduledAt(toLocalInput(row.scheduled_at))
        setStartedAt(row.started_at)
        setEndsAt(toLocalInput(row.ends_at))
        setHideScheduleTime(Boolean(row.hide_schedule_time))
        setMatchOrder(String(row.match_order || 1))
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
          const [list, sportMatches] = await Promise.all([
            fetchRegistrations(row.sport),
            fetchMatches(row.sport),
          ])
          if (!cancelled) {
            setRegs(
              list.filter(
                (r) => r.team_id === row.home_team_id || r.team_id === row.away_team_id,
              ),
            )
            setMatchOrderLimit(
              sportMatches.filter((candidate) => candidate.group_code === row.group_code).length,
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

  const liveMinutePreview = useMemo(() => {
    if (!startedAt) return 0
    const start = new Date(startedAt).getTime()
    if (Number.isNaN(start)) return 0
    void clockNow
    return Math.min(120, Math.max(0, Math.floor((clockNow - start) / 60000)))
  }, [startedAt, clockNow])

  function regsForTeam(teamId: string) {
    return regs
      .filter((r) => r.team_id === teamId && jerseyKey(r.jersey_number))
      .slice()
      .sort((a, b) => sortJersey(jerseyKey(a.jersey_number), jerseyKey(b.jersey_number)))
  }

  function resolveFromJersey(teamId: string, jersey: string): Partial<GoalDraft> {
    const key = jerseyKey(jersey)
    const reg = regsForTeam(teamId).find((r) => jerseyKey(r.jersey_number) === key)
    if (!reg) {
      return {
        jersey_number: jersey,
        player_name: null,
        registration_id: null,
      }
    }
    return {
      jersey_number: jerseyKey(reg.jersey_number) || jersey,
      player_name: reg.full_name,
      registration_id: reg.id,
      team_id: reg.team_id,
    }
  }

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
    setGoals((prev) =>
      prev.map((g, i) => {
        if (i !== index) return g
        const next = { ...g, ...patch }
        if (patch.team_id != null && patch.team_id !== g.team_id) {
          return {
            ...next,
            jersey_number: '',
            player_name: null,
            registration_id: null,
            minute_approx: null,
          }
        }
        if (patch.jersey_number != null) {
          return { ...next, ...resolveFromJersey(next.team_id, patch.jersey_number) }
        }
        return next
      }),
    )
  }

  function removeGoal(index: number) {
    setGoals((prev) => prev.filter((_, i) => i !== index))
  }

  function ensurePlayingStarted() {
    if (!startedAt) setStartedAt(new Date().toISOString())
    if (status === 'scheduled' || status === 'halftime') setStatus('live')
  }

  function changeStatus(next: MatchStatus) {
    if ((next === 'live' || next === 'halftime') && status !== 'live' && status !== 'halftime') {
      setStartedAt(new Date().toISOString())
    } else if (next === 'scheduled' || next === 'postponed' || next === 'cancelled') {
      setStartedAt(null)
    }
    setStatus(next)
  }

  function advanceAfterSetWin(nextHomeScore: number, nextAwayScore: number) {
    const merged = writeSetPair(setScores, pointsSet, homePoints, awayPoints)
    setSetScores(merged)
    if (nextHomeScore >= 2 || nextAwayScore >= 2) {
      setStatus('finished')
      return
    }
    const nextSet = clampSetNumber(Math.min(3, pointsSet + 1))
    setPointsSet(nextSet)
    const pair = readSetPair(merged, nextSet)
    setHomePoints(pair.home)
    setAwayPoints(pair.away)
  }

  function bumpHome(delta: number) {
    const limit = match?.sport === 'volleyball' ? 2 : Number.POSITIVE_INFINITY
    const next = Math.min(limit, Math.max(0, homeScore + delta))
    if (next === homeScore) return
    setHomeScore(next)
    if (delta > 0) {
      ensurePlayingStarted()
      if (match?.sport === 'volleyball') advanceAfterSetWin(next, awayScore)
    }
  }

  function bumpAway(delta: number) {
    const limit = match?.sport === 'volleyball' ? 2 : Number.POSITIVE_INFINITY
    const next = Math.min(limit, Math.max(0, awayScore + delta))
    if (next === awayScore) return
    setAwayScore(next)
    if (delta > 0) {
      ensurePlayingStarted()
      if (match?.sport === 'volleyball') advanceAfterSetWin(homeScore, next)
    }
  }

  function selectPointsSet(next: SetNumber) {
    if (next === pointsSet) return
    const merged = writeSetPair(setScores, pointsSet, homePoints, awayPoints)
    const pair = readSetPair(merged, next)
    setSetScores(merged)
    setPointsSet(next)
    setHomePoints(pair.home)
    setAwayPoints(pair.away)
  }

  function bumpHomePoints(delta: number) {
    setHomePoints((n) => Math.max(0, n + delta))
    if (delta > 0) ensurePlayingStarted()
  }

  function bumpAwayPoints(delta: number) {
    setAwayPoints((n) => Math.max(0, n + delta))
    if (delta > 0) ensurePlayingStarted()
  }

  async function save() {
    if (!match) return
    const parsedMatchOrder = Number(matchOrder)
    if (
      !Number.isInteger(parsedMatchOrder) ||
      parsedMatchOrder < 1 ||
      parsedMatchOrder > matchOrderLimit
    ) {
      setError(`ลำดับการแข่งขันต้องอยู่ระหว่าง 1–${matchOrderLimit}`)
      return
    }
    const startIso = fromLocalInput(scheduledAt)
    if (!startIso) {
      setError('กรุณาตั้งเวลาเริ่มแข่ง')
      return
    }
    const effectiveStartedAt =
      startedAt ?? (status === 'live' || status === 'halftime' ? new Date().toISOString() : null)
    const stampMinute = matchMinuteFromKickoff(effectiveStartedAt)
    const elapsedSec = effectiveStartedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(effectiveStartedAt).getTime()) / 1000))
      : 0
    const liveClock =
      status === 'live'
        ? `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`
        : null
    setSaving(true)
    setToast(null)
    setError(null)
    try {
      const patch = {
        status,
        home_score: homeScore,
        away_score: awayScore,
        home_points: match.sport === 'volleyball' ? homePoints : 0,
        away_points: match.sport === 'volleyball' ? awayPoints : 0,
        points_set: match.sport === 'volleyball' ? pointsSet : 1,
        set_scores:
          match.sport === 'volleyball'
            ? writeSetPair(setScores, pointsSet, homePoints, awayPoints)
            : {},
        live_clock: liveClock,
        period_label: periodLabel.trim() || null,
        scheduled_at: startIso,
        started_at: effectiveStartedAt,
        ends_at: fromLocalInput(endsAt),
        hide_schedule_time: hideScheduleTime,
        match_order: parsedMatchOrder,
        updated_at: new Date().toISOString(),
      }
      let stamped: GoalDraft[] | null = null
      if (match.sport === 'football') {
        stamped = goals
          .filter((g) => g.jersey_number.trim())
          .map((g) => {
            const linked = resolveFromJersey(g.team_id, g.jersey_number)
            return {
              ...g,
              ...(linked.registration_id ? linked : {}),
              minute_approx: g.minute_approx ?? stampMinute,
            }
          })
      }
      await saveMatchState(matchId, patch, stamped)
      if (stamped) setGoals(stamped)
      setStartedAt(effectiveStartedAt)
      setToast(`บันทึกแล้ว · นาทีใหม่ล็อกที่ ${stampMinute}'`)
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
        <h2>
          {match.sport === 'volleyball' ? 'วอลเลย์' : 'ฟุตซอล'}
          {match.group_code ? ` · สาย ${match.group_code}` : match.stage === 'final' ? ' · นัดชิง' : match.stage === 'semi' ? ' · รองฯ' : ''}
        </h2>
      </div>

      <div className="editor-panel">
        <div className="field">
          <label htmlFor="match-order">
            {match.group_code
              ? `ลำดับการแข่งขันในสาย ${match.group_code}`
              : 'ลำดับรอบรอง / รอบชิง'}
          </label>
          <select
            id="match-order"
            value={matchOrder}
            onChange={(e) => setMatchOrder(e.target.value)}
          >
            {Array.from({ length: matchOrderLimit }, (_, index) => index + 1).map((order) => (
              <option key={order} value={order}>
                นัดที่ {order}
              </option>
            ))}
          </select>
          <p className="field-hint">
            เลือกลำดับใหม่แล้ว คู่ที่อยู่ลำดับนั้นจะสลับตำแหน่งให้อัตโนมัติ
          </p>
        </div>
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
        <label className="field checkbox-field" style={{ marginTop: 12, marginBottom: 0 }}>
          <input
            type="checkbox"
            checked={hideScheduleTime}
            onChange={(e) => setHideScheduleTime(e.target.checked)}
          />
          <span>ซ่อนเวลาตารางจากคนดู — แสดง “นัดที่ {matchOrder || '…'}” แทน</span>
        </label>
      </div>

      <div className="editor-panel">
        <div className="editor-title">
          {match.sport === 'volleyball' ? 'เซตที่ชนะ' : 'สกอร์'}
        </div>
        {match.sport === 'volleyball' ? (
          <p className="field-hint" style={{ marginTop: 0 }}>
            แข่งชนะ 2 ใน 3 เซต · ถ้านำ 2–0 จะจบทันที ไม่เปิดเซต 3 · ชนะแมตช์ได้ 3 แต้มในตาราง
          </p>
        ) : null}
        <div className="score-edit">
          <div className="score-side">
            <div className="name">{teamName(match.home)}</div>
            <div className="big">{homeScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => bumpHome(-1)}>
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => bumpHome(1)}>
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="vs">VS</div>
          <div className="score-side">
            <div className="name">{teamName(match.away)}</div>
            <div className="big">{awayScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => bumpAway(-1)}>
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => bumpAway(1)}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {match.sport === 'volleyball' ? (
        <div className="editor-panel">
          <div className="editor-title">แต้มในเซต</div>
          <p className="field-hint" style={{ marginTop: 0 }}>
            เลือกเซต 1–3 แล้วบันทึกแต้มของเซตนั้น · หน้าเว็บจะโชว์แต้มของเซตที่เลือก (เล็กกว่าเซต)
          </p>
          <div className="set-picker" role="group" aria-label="เลือกเซตที่แสดงแต้ม">
            {([1, 2, 3] as SetNumber[]).map((n) => {
              const saved = readSetPair(
                writeSetPair(setScores, pointsSet, homePoints, awayPoints),
                n,
              )
              const active = n === pointsSet
              return (
                <button
                  key={n}
                  type="button"
                  className={`set-picker-btn${active ? ' active' : ''}`}
                  onClick={() => selectPointsSet(n)}
                >
                  <span className="set-picker-label">เซต {n}</span>
                  <span className="set-picker-score">
                    {saved.home}–{saved.away}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="score-edit score-edit-points">
            <div className="score-side">
              <div className="name">{teamName(match.home)}</div>
              <div className="mid">{homePoints}</div>
              <div className="score-btns">
                <button type="button" onClick={() => bumpHomePoints(-1)}>
                  <Minus size={16} />
                </button>
                <button type="button" onClick={() => bumpHomePoints(1)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="vs">เซต {pointsSet}</div>
            <div className="score-side">
              <div className="name">{teamName(match.away)}</div>
              <div className="mid">{awayPoints}</div>
              <div className="score-btns">
                <button type="button" onClick={() => bumpAwayPoints(-1)}>
                  <Minus size={16} />
                </button>
                <button type="button" onClick={() => bumpAwayPoints(1)}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="editor-panel">
        <div className="field">
          <label htmlFor="status">สถานะ</label>
          <select id="status" value={status} onChange={(e) => changeStatus(e.target.value as MatchStatus)}>
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
            placeholder={match.sport === 'volleyball' ? 'เช่น เซต 2' : 'เช่น ครึ่งแรก'}
          />
        </div>
      </div>

      {match.sport === 'football' ? (
        <div className="editor-panel">
          <div className="editor-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>ผู้ยิง (เลือกเบอร์)</span>
            <button type="button" className="btn ghost" onClick={addGoal}>
              + เพิ่ม
            </button>
          </div>
          <p className="field-hint">
            เลือกเบอร์จากทะเบียน · ชื่อล็อกอัตโนมัติ · นาทีใหม่ล็อกจากนาฬิกานัดเมื่อกดบันทึก
            (ตอนนี้ ~{liveMinutePreview}')
          </p>
          {goals.length === 0 ? (
            <p className="field-hint">ยังไม่มีรายการ</p>
          ) : (
            goals.map((g, index) => {
              const teamRegs = regsForTeam(g.team_id)
              const lockedName =
                g.player_name ||
                teamRegs.find((r) => jerseyKey(r.jersey_number) === jerseyKey(g.jersey_number))
                  ?.full_name ||
                '—'
              return (
                <div className="goal-edit-row goal-edit-row-simple" key={g.id ?? index}>
                  <select
                    value={g.team_id}
                    onChange={(e) => updateGoal(index, { team_id: e.target.value })}
                    aria-label="ทีม"
                  >
                    {teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={jerseyKey(g.jersey_number)}
                    onChange={(e) => updateGoal(index, { jersey_number: e.target.value })}
                    aria-label="เบอร์เสื้อ"
                  >
                    <option value="">เลือกเบอร์</option>
                    {teamRegs.map((r) => {
                      const j = jerseyKey(r.jersey_number)
                      return (
                        <option key={r.id} value={j}>
                          #{j}
                        </option>
                      )
                    })}
                  </select>
                  <div className="goal-locked-name" title={lockedName}>
                    {g.jersey_number ? lockedName : 'ชื่อจะขึ้นเมื่อเลือกเบอร์'}
                  </div>
                  <div className="goal-locked-min">
                    {g.minute_approx != null ? `${g.minute_approx}'` : `→ ${liveMinutePreview}'`}
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => removeGoal(index)}
                    aria-label="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })
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

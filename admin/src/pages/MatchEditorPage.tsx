import { Minus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GoalScorerDialog,
  type ScorerChoice,
} from '../components/GoalScorerDialog'
import {
  fetchMatch,
  fetchMatchGoals,
  fetchMatches,
  saveMatchState,
  saveVolleyballPoints,
  teamName,
  type GoalDraft,
  type VolleyballPointsUpdate,
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

type ScorerPrompt = {
  teamId: string
  goalIndex?: number
  scoreWasAdded: boolean
  minute: number
}

type PointSaveState = 'idle' | 'saving' | 'saved' | 'error'

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
  const [scorerPrompt, setScorerPrompt] = useState<ScorerPrompt | null>(null)
  const [pointSaveState, setPointSaveState] = useState<PointSaveState>('idle')
  const [pointSaveError, setPointSaveError] = useState<string | null>(null)
  const pendingPointSaveRef = useRef<VolleyballPointsUpdate | null>(null)
  const pointSavePromiseRef = useRef<Promise<void> | null>(null)
  const pointSaveFailedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clockNow, setClockNow] = useState(() => Date.now())
  const knockoutTeamsPending = Boolean(
    match && match.stage !== 'group' &&
    (match.home_team_id.startsWith('slot-') || match.away_team_id.startsWith('slot-')),
  )

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

  const goalSummary = useMemo(() => {
    if (!match) {
      return { homeAssigned: 0, awayAssigned: 0, homeTracked: 0, awayTracked: 0 }
    }
    const homeGoals = goals.filter((goal) => goal.team_id === match.home_team_id)
    const awayGoals = goals.filter((goal) => goal.team_id === match.away_team_id)
    return {
      homeAssigned: homeGoals.filter((goal) => jerseyKey(goal.jersey_number)).length,
      awayAssigned: awayGoals.filter((goal) => jerseyKey(goal.jersey_number)).length,
      homeTracked: homeGoals.length,
      awayTracked: awayGoals.length,
    }
  }, [goals, match])

  const homePendingScorers = Math.max(0, homeScore - goalSummary.homeAssigned)
  const awayPendingScorers = Math.max(0, awayScore - goalSummary.awayAssigned)
  const totalPendingScorers = homePendingScorers + awayPendingScorers

  const scorerCandidates = useMemo(() => {
    if (!scorerPrompt) return []
    return regs
      .filter((registration) => {
        return registration.team_id === scorerPrompt.teamId && jerseyKey(registration.jersey_number)
      })
      .slice()
      .sort((a, b) => sortJersey(jerseyKey(a.jersey_number), jerseyKey(b.jersey_number)))
      .map((registration) => ({
        id: registration.id,
        name: registration.full_name,
        jerseyNumber: jerseyKey(registration.jersey_number),
      }))
  }, [regs, scorerPrompt])

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

  function lastTrackedGoalIndex(teamId: string): number {
    for (let index = goals.length - 1; index >= 0; index -= 1) {
      if (goals[index].team_id === teamId && !jerseyKey(goals[index].jersey_number)) return index
    }
    for (let index = goals.length - 1; index >= 0; index -= 1) {
      if (goals[index].team_id === teamId) return index
    }
    return -1
  }

  function removeGoalForScoreDecrease(teamId: string, currentScore: number) {
    const trackedCount = goals.filter((goal) => goal.team_id === teamId).length
    if (trackedCount < currentScore) return
    const index = lastTrackedGoalIndex(teamId)
    if (index >= 0) removeGoal(index)
  }

  function openPendingScorer(teamId: string, requestedGoalIndex?: number) {
    const firstPendingGoalIndex = goals.findIndex(
      (goal) => goal.team_id === teamId && !jerseyKey(goal.jersey_number),
    )
    const goalIndex = requestedGoalIndex ?? firstPendingGoalIndex
    setScorerPrompt({
      teamId,
      goalIndex: goalIndex >= 0 ? goalIndex : undefined,
      scoreWasAdded: false,
      minute: goalIndex >= 0 ? (goals[goalIndex].minute_approx ?? liveMinutePreview) : liveMinutePreview,
    })
  }

  function chooseScorer(choice: ScorerChoice) {
    if (!scorerPrompt) return
    const goal: GoalDraft = {
      team_id: scorerPrompt.teamId,
      jersey_number: choice.jerseyNumber,
      minute_approx: scorerPrompt.minute,
      player_name: choice.playerName,
      registration_id: choice.registrationId,
    }
    if (scorerPrompt.goalIndex != null) {
      updateGoal(scorerPrompt.goalIndex, goal)
    } else {
      setGoals((prev) => [...prev, goal])
    }
    setScorerPrompt(null)
  }

  function chooseScorerLater() {
    if (!scorerPrompt) return
    if (scorerPrompt.scoreWasAdded) {
      setGoals((prev) => [
        ...prev,
        {
          team_id: scorerPrompt.teamId,
          jersey_number: '',
          minute_approx: scorerPrompt.minute,
          player_name: null,
          registration_id: null,
        },
      ])
    }
    setScorerPrompt(null)
  }

  function undoPromptGoal() {
    if (!match || !scorerPrompt?.scoreWasAdded) return
    if (scorerPrompt.teamId === match.home_team_id) {
      setHomeScore((score) => Math.max(0, score - 1))
    } else if (scorerPrompt.teamId === match.away_team_id) {
      setAwayScore((score) => Math.max(0, score - 1))
    }
    setScorerPrompt(null)
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
    if (delta < 0 && match?.sport === 'football') {
      removeGoalForScoreDecrease(match.home_team_id, homeScore)
    }
    setHomeScore(next)
    if (delta > 0) {
      ensurePlayingStarted()
      if (match?.sport === 'volleyball') {
        advanceAfterSetWin(next, awayScore)
      } else if (match) {
        setScorerPrompt({
          teamId: match.home_team_id,
          scoreWasAdded: true,
          minute: liveMinutePreview,
        })
      }
    }
  }

  function bumpAway(delta: number) {
    const limit = match?.sport === 'volleyball' ? 2 : Number.POSITIVE_INFINITY
    const next = Math.min(limit, Math.max(0, awayScore + delta))
    if (next === awayScore) return
    if (delta < 0 && match?.sport === 'football') {
      removeGoalForScoreDecrease(match.away_team_id, awayScore)
    }
    setAwayScore(next)
    if (delta > 0) {
      ensurePlayingStarted()
      if (match?.sport === 'volleyball') {
        advanceAfterSetWin(homeScore, next)
      } else if (match) {
        setScorerPrompt({
          teamId: match.away_team_id,
          scoreWasAdded: true,
          minute: liveMinutePreview,
        })
      }
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

  function flushPointSaveQueue(): Promise<void> {
    if (pointSavePromiseRef.current) return pointSavePromiseRef.current

    setPointSaveState('saving')
    setPointSaveError(null)
    const promise = (async () => {
      while (pendingPointSaveRef.current) {
        const payload = pendingPointSaveRef.current
        pendingPointSaveRef.current = null
        try {
          await saveVolleyballPoints(matchId, payload)
        } catch (err: unknown) {
          // Preserve the latest unsaved snapshot so Retry cannot write an older score.
          pendingPointSaveRef.current ??= payload
          pointSaveFailedRef.current = true
          setPointSaveState('error')
          setPointSaveError(err instanceof Error ? err.message : 'บันทึกแต้มไม่สำเร็จ')
          return
        }
      }
      pointSaveFailedRef.current = false
      setPointSaveState('saved')
    })().finally(() => {
      pointSavePromiseRef.current = null
      if (pendingPointSaveRef.current && !pointSaveFailedRef.current) {
        void flushPointSaveQueue()
      }
    })
    pointSavePromiseRef.current = promise
    return promise
  }

  function queuePointSave(payload: VolleyballPointsUpdate) {
    pendingPointSaveRef.current = payload
    pointSaveFailedRef.current = false
    setPointSaveState('saving')
    setPointSaveError(null)
    void flushPointSaveQueue()
  }

  function retryPointSave() {
    pointSaveFailedRef.current = false
    void flushPointSaveQueue()
  }

  function bumpHomePoints(delta: number) {
    const nextHomePoints = Math.max(0, homePoints + delta)
    if (nextHomePoints === homePoints) return
    const nextSetScores = writeSetPair(setScores, pointsSet, nextHomePoints, awayPoints)
    setHomePoints(nextHomePoints)
    setSetScores(nextSetScores)
    queuePointSave({
      homePoints: nextHomePoints,
      awayPoints,
      pointsSet,
      setScores: nextSetScores,
    })
    if (delta > 0) ensurePlayingStarted()
  }

  function bumpAwayPoints(delta: number) {
    const nextAwayPoints = Math.max(0, awayPoints + delta)
    if (nextAwayPoints === awayPoints) return
    const nextSetScores = writeSetPair(setScores, pointsSet, homePoints, nextAwayPoints)
    setAwayPoints(nextAwayPoints)
    setSetScores(nextSetScores)
    queuePointSave({
      homePoints,
      awayPoints: nextAwayPoints,
      pointsSet,
      setScores: nextSetScores,
    })
    if (delta > 0) ensurePlayingStarted()
  }

  async function save() {
    if (!match) return
    if (knockoutTeamsPending &&
        (status === 'live' || status === 'halftime' || status === 'finished' ||
         homeScore > 0 || awayScore > 0 || homePoints > 0 || awayPoints > 0)) {
      setError('กรุณายืนยันทีมจริงในเมนูตารางคะแนนและจัดคู่น็อกเอาต์ก่อนเริ่มแข่ง')
      return
    }
    if (
      match.sport === 'football' &&
      (goalSummary.homeTracked > homeScore || goalSummary.awayTracked > awayScore)
    ) {
      setError('รายการประตูมากกว่าสกอร์ กรุณาลบรายการผู้ยิงที่เกินก่อนบันทึก')
      return
    }
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
        stamped = goals.map((g) => {
            if (!g.jersey_number.trim()) {
              return {
                ...g,
                jersey_number: '',
                player_name: null,
                registration_id: null,
                minute_approx: g.minute_approx ?? stampMinute,
              }
            }
            const linked = resolveFromJersey(g.team_id, g.jersey_number)
            return {
              ...g,
              ...(linked.registration_id ? linked : {}),
              minute_approx: g.minute_approx ?? stampMinute,
            }
          })
      }
      if (match.sport === 'volleyball' && pointSavePromiseRef.current) {
        await pointSavePromiseRef.current
      }
      await saveMatchState(matchId, patch, stamped)
      if (stamped) setGoals(stamped)
      setStartedAt(effectiveStartedAt)
      if (match.sport === 'volleyball') {
        pendingPointSaveRef.current = null
        pointSaveFailedRef.current = false
        setPointSaveState('saved')
        setPointSaveError(null)
      }
      setToast(
        totalPendingScorers > 0
          ? `บันทึกแล้ว · รอระบุผู้ยิง ${totalPendingScorers} ประตู`
          : `บันทึกแล้ว · นาทีล่าสุด ${stampMinute}'`,
      )
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
          {match.group_code
            ? ` · สาย ${match.group_code}`
            : match.stage === 'final'
              ? ' · นัดชิง'
              : match.stage === 'third'
                ? ' · ชิงอันดับ 3'
                : match.stage === 'semi'
                  ? ' · รองฯ'
                  : ''}
        </h2>
      </div>

      {knockoutTeamsPending ? (
        <div className="tournament-warning" role="note">
          คู่นี้ยังเป็นทีมรอผล · กรุณาเลือกทีมจริงในเมนู “ตารางคะแนนและจัดคู่น็อกเอาต์”
          ก่อนกรอกผลการแข่งขัน
        </div>
      ) : null}

      <div className="editor-panel">
        <div className="field">
          <label htmlFor="match-order">
            {match.group_code
              ? `ลำดับการแข่งขันในสาย ${match.group_code}`
              : 'ลำดับรอบน็อคเอาต์'}
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
              <button type="button" onClick={() => bumpHome(-1)} disabled={knockoutTeamsPending}>
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => bumpHome(1)} disabled={knockoutTeamsPending}>
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="vs">VS</div>
          <div className="score-side">
            <div className="name">{teamName(match.away)}</div>
            <div className="big">{awayScore}</div>
            <div className="score-btns">
              <button type="button" onClick={() => bumpAway(-1)} disabled={knockoutTeamsPending}>
                <Minus size={18} />
              </button>
              <button type="button" onClick={() => bumpAway(1)} disabled={knockoutTeamsPending}>
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {match.sport === 'volleyball' ? (
        <div className="editor-panel">
          <div className="editor-title point-editor-title">
            <span>แต้มในเซต</span>
            {pointSaveState === 'saving' ? (
              <span className="point-save-status is-saving" role="status">
                กำลังบันทึก…
              </span>
            ) : pointSaveState === 'saved' ? (
              <span className="point-save-status is-saved" role="status">
                บันทึกแต้มแล้ว
              </span>
            ) : pointSaveState === 'error' ? (
              <button
                type="button"
                className="point-save-retry"
                onClick={retryPointSave}
                disabled={saving}
              >
                บันทึกไม่สำเร็จ · ลองใหม่
              </button>
            ) : null}
          </div>
          <p className="field-hint" style={{ marginTop: 0 }}>
            กด +/− แล้วบันทึกแต้มทันที · สถานะ เวลา และข้อมูลอื่นยังต้องกดปุ่มบันทึกด้านล่าง
          </p>
          {pointSaveError ? <p className="point-save-error">{pointSaveError}</p> : null}
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
                  disabled={saving || knockoutTeamsPending}
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
                <button
                  type="button"
                  onClick={() => bumpHomePoints(-1)}
                  disabled={saving || knockoutTeamsPending}
                  aria-label={`ลดแต้ม ${teamName(match.home)}`}
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => bumpHomePoints(1)}
                  disabled={saving || knockoutTeamsPending}
                  aria-label={`เพิ่มแต้ม ${teamName(match.home)}`}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="vs">เซต {pointsSet}</div>
            <div className="score-side">
              <div className="name">{teamName(match.away)}</div>
              <div className="mid">{awayPoints}</div>
              <div className="score-btns">
                <button
                  type="button"
                  onClick={() => bumpAwayPoints(-1)}
                  disabled={saving || knockoutTeamsPending}
                  aria-label={`ลดแต้ม ${teamName(match.away)}`}
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => bumpAwayPoints(1)}
                  disabled={saving || knockoutTeamsPending}
                  aria-label={`เพิ่มแต้ม ${teamName(match.away)}`}
                >
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
              <option key={s} value={s} disabled={knockoutTeamsPending && (s === 'live' || s === 'halftime' || s === 'finished')}>
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
          <div className="editor-title goal-section-title">
            <span>ผู้ยิงประตู</span>
            {totalPendingScorers > 0 ? (
              <span className="goal-pending-count">ค้าง {totalPendingScorers}</span>
            ) : null}
          </div>
          <p className="field-hint">
            กด + ที่สกอร์แล้วเลือกผู้ยิงได้ทันที · ถ้ายังไม่ทราบ กรอกย้อนหลังได้ · นาทีปัจจุบัน
            ~{liveMinutePreview}'
          </p>
          {totalPendingScorers > 0 ? (
            <div className="goal-pending-actions" aria-label="ประตูที่ยังไม่ระบุผู้ยิง">
              {homePendingScorers > 0 ? (
                <button type="button" onClick={() => openPendingScorer(match.home_team_id)}>
                  <span>{teamName(match.home)}</span>
                  <strong>{homePendingScorers} ประตู · เลือกผู้ยิง</strong>
                </button>
              ) : null}
              {awayPendingScorers > 0 ? (
                <button type="button" onClick={() => openPendingScorer(match.away_team_id)}>
                  <span>{teamName(match.away)}</span>
                  <strong>{awayPendingScorers} ประตู · เลือกผู้ยิง</strong>
                </button>
              ) : null}
            </div>
          ) : null}
          {goals.length === 0 ? <p className="field-hint">ยังไม่มีรายการผู้ยิง</p> : null}
          {goals.map((g, index) => {
              const teamRegs = regsForTeam(g.team_id)
              const currentJersey = jerseyKey(g.jersey_number)
              const jerseyIsRegistered = teamRegs.some(
                (registration) => jerseyKey(registration.jersey_number) === currentJersey,
              )
              const lockedName =
                g.player_name ||
                teamRegs.find((r) => jerseyKey(r.jersey_number) === currentJersey)
                  ?.full_name ||
                '—'
              return (
                <div className="goal-edit-row goal-edit-row-simple" key={g.id ?? index}>
                  <select
                    className="goal-team-select"
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
                    className="goal-jersey-select"
                    value={currentJersey}
                    onChange={(e) => updateGoal(index, { jersey_number: e.target.value })}
                    aria-label="เบอร์เสื้อ"
                  >
                    <option value="">เลือกเบอร์</option>
                    {currentJersey && !jerseyIsRegistered ? (
                      <option value={currentJersey}>#{currentJersey} (กรอกเอง)</option>
                    ) : null}
                    {teamRegs.map((r) => {
                      const j = jerseyKey(r.jersey_number)
                      return (
                        <option key={r.id} value={j}>
                          #{j}
                        </option>
                      )
                    })}
                  </select>
                  {currentJersey ? (
                    <div className="goal-locked-name" title={lockedName}>
                      {lockedName}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="goal-locked-name goal-assign-button"
                      onClick={() => openPendingScorer(g.team_id, index)}
                    >
                      ระบุผู้ยิงภายหลัง
                    </button>
                  )}
                  <label className="goal-minute-field">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={g.minute_approx ?? ''}
                      onChange={(event) => {
                        const value = event.target.value
                        updateGoal(index, {
                          minute_approx: value === '' ? null : Math.min(120, Math.max(0, Number(value))),
                        })
                      }}
                      placeholder={String(liveMinutePreview)}
                      aria-label="นาทีที่ทำประตู"
                    />
                    <span>'</span>
                  </label>
                  <button
                    type="button"
                    className="btn ghost goal-remove-button"
                    onClick={() => removeGoal(index)}
                    aria-label="ลบรายการผู้ยิง"
                    title="ลบรายการผู้ยิง (สกอร์ยังคงเดิม)"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
        </div>
      ) : null}

      {scorerPrompt ? (
        <GoalScorerDialog
          teamName={
            teamOptions.find((team) => team.id === scorerPrompt.teamId)?.label ?? 'ทีมที่ทำประตู'
          }
          minute={scorerPrompt.minute}
          candidates={scorerCandidates}
          canUndoGoal={scorerPrompt.scoreWasAdded}
          onChoose={chooseScorer}
          onLater={chooseScorerLater}
          onUndoGoal={undoPromptGoal}
        />
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

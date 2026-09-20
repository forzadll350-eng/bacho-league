import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  assignKnockoutTeams,
  fetchGroupStandings,
  fetchMatches,
  KNOCKOUT_DEFAULTS,
  teamName,
  type GroupStandingRow,
} from '../api/matches'
import type { MatchRow, SportType } from '../types'
import { SPORT_LABELS } from '../types'

const FIXTURE_IDS: Record<SportType, string[]> = {
  football: ['fb-sf-1', 'fb-sf-2', 'fb-third', 'fb-final'],
  volleyball: ['vb-final'],
}

const FIXTURE_LABELS: Record<string, string> = {
  'fb-sf-1': 'รอบรองชนะเลิศ 1',
  'fb-sf-2': 'รอบรองชนะเลิศ 2',
  'fb-third': 'ชิงอันดับ 3',
  'fb-final': 'ชิงชนะเลิศ',
  'vb-final': 'ชิงชนะเลิศ',
}

type Choice = { home: string; away: string }

function displayTeam(row: GroupStandingRow): string {
  return row.team?.name_th ?? row.team_id
}

export function TournamentSetupPage({
  initialSport,
  onBack,
}: {
  initialSport: SportType
  onBack: () => void
}) {
  const [sport, setSport] = useState<SportType>(initialSport)
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [standings, setStandings] = useState<GroupStandingRow[]>([])
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    try {
      const [nextMatches, nextStandings] = await Promise.all([
        fetchMatches(sport),
        fetchGroupStandings(sport),
      ])
      if (requestId !== requestIdRef.current) return false
      setMatches(nextMatches)
      setStandings(nextStandings)
      setChoices(Object.fromEntries(nextMatches.map((match) => [
        match.id,
        {
          home: match.home_team_id,
          away: match.away_team_id,
        },
      ])))
      return true
    } catch (err: unknown) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'โหลดตารางคะแนนไม่สำเร็จ')
      }
      return false
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [sport])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => {
      window.clearTimeout(timer)
      requestIdRef.current += 1
    }
  }, [load])

  const groupMatches = useMemo(() => matches.filter((match) =>
    match.stage === 'group' && (match.group_code === 'A' || match.group_code === 'B'),
  ), [matches])
  const completedCount = groupMatches.filter((match) => match.status === 'finished').length
  const fixtures = FIXTURE_IDS[sport]
    .map((id) => matches.find((match) => match.id === id))
    .filter((match): match is MatchRow => Boolean(match))

  function setChoice(matchId: string, side: 'home' | 'away', value: string) {
    setChoices((current) => ({
      ...current,
      [matchId]: { ...current[matchId], [side]: value },
    }))
    setError(null)
    setNotice(null)
  }

  async function confirmTeams(match: MatchRow, selection?: Choice) {
    const choice = selection ?? choices[match.id]
    const defaults = KNOCKOUT_DEFAULTS[match.id]
    if (!defaults) return
    if (!choice?.home || !choice.away) {
      setError('กรุณาเลือกทีมทั้งสองฝั่ง')
      return
    }
    const restoring = choice.home === defaults.home.id && choice.away === defaults.away.id
    const homeLabel = choice.home === defaults.home.id
      ? defaults.home.label
      : standings.find((row) => row.team_id === choice.home)?.team?.name_th ?? choice.home
    const awayLabel = choice.away === defaults.away.id
      ? defaults.away.label
      : standings.find((row) => row.team_id === choice.away)?.team?.name_th ?? choice.away
    if (!window.confirm(`${restoring ? 'คืน' : 'ยืนยัน'} ${FIXTURE_LABELS[match.id]}\n${homeLabel} พบ ${awayLabel}\nชื่อทีมจะเปลี่ยนในหน้าคนดูทันที`)) return
    setSavingId(match.id)
    setError(null)
    setNotice(null)
    try {
      await assignKnockoutTeams(match.id, sport, choice.home, choice.away, match.updated_at)
      setLoading(true)
      if (await load()) {
        setNotice(`${restoring ? 'คืนช่องรอผล' : 'จัดคู่'} ${homeLabel} พบ ${awayLabel} แล้ว · หน้าคนดูอัปเดตตาม`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'จัดคู่แข่งขันไม่สำเร็จ')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="app tournament-admin">
      <div className="editor-header">
        <button type="button" className="btn ghost" onClick={onBack} disabled={savingId !== null}>
          ← กลับ
        </button>
        <h2>ตารางคะแนน / จัดคู่น็อกเอาต์</h2>
      </div>

      <div className="sport-toggle" role="tablist" aria-label="เลือกชนิดกีฬา">
        {(['football', 'volleyball'] as SportType[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={sport === item}
            className={sport === item ? 'active' : ''}
            onClick={() => {
              requestIdRef.current += 1
              setLoading(true)
              setMatches([])
              setStandings([])
              setSport(item)
              setNotice(null)
              setError(null)
            }}
            disabled={savingId !== null}
          >
            {SPORT_LABELS[item]}
          </button>
        ))}
      </div>

      {loading ? <div className="loading">กำลังโหลดตารางคะแนน…</div> : null}
      {error ? <div className="error" role="alert">{error}</div> : null}
      {notice ? <div className="tournament-notice" role="status">{notice}</div> : null}
      {!loading ? (
        <>
          <div className="tournament-progress">
            รอบแบ่งสายจบแล้ว {completedCount}/{groupMatches.length} นัด
            <button type="button" className="btn ghost" onClick={() => {
              setLoading(true)
              setError(null)
              void load()
            }} disabled={savingId !== null}>
              โหลดใหม่
            </button>
          </div>
          {(['A', 'B'] as const).map((group) => {
            const rows = standings.filter((row) => row.group_code === group)
            return (
              <section className="tournament-panel" key={group}>
                <h3>ตารางคะแนนสาย {group}</h3>
                <div className="tournament-table-head">
                  <span>อันดับ / ทีม</span><span>แข่ง</span><span>ผลงาน</span><span>แต้ม</span>
                </div>
                {rows.length ? rows.map((row) => (
                  <div className="tournament-table-row" key={row.team_id}>
                    <span><b>{row.rank}</b> {displayTeam(row)}</span>
                    <span>{row.played}</span>
                    <span>{sport === 'volleyball'
                      ? `${row.sets_won ?? 0}–${row.sets_lost ?? 0} เซต`
                      : `${row.won ?? 0}–${row.drawn ?? 0}–${row.lost ?? 0}`}</span>
                    <strong>{row.points}</strong>
                  </div>
                )) : <p className="field-hint">ยังไม่มีข้อมูลในสายนี้</p>}
              </section>
            )
          })}

          <section className="tournament-fixtures">
            <h3>ยืนยันทีมจริงในรอบน็อกเอาต์</h3>
            <p className="field-hint">
              แอดมินเลือกทีมจากสายใดก็ได้ หรือคืนเป็นช่องรออันดับเดิมได้ก่อนเริ่มแข่ง · เมื่อยืนยันแล้ว
              ชื่อและตราทีมจะเปลี่ยนทั้งหน้าคนดูและหน้าแอดมิน
            </p>
            {fixtures.map((match) => {
              const defaults = KNOCKOUT_DEFAULTS[match.id]
              if (!defaults) return null
              const editable = match.status === 'scheduled' &&
                match.home_score === 0 && match.away_score === 0 &&
                (match.home_points ?? 0) === 0 && (match.away_points ?? 0) === 0
              const choice = choices[match.id] ?? { home: match.home_team_id, away: match.away_team_id }
              const unchanged = choice.home === match.home_team_id && choice.away === match.away_team_id
              const alreadyDefault = match.home_team_id === defaults.home.id &&
                match.away_team_id === defaults.away.id
              return (
                <div className="tournament-fixture" key={match.id}>
                  <h4>{FIXTURE_LABELS[match.id]}</h4>
                  <p className="field-hint">
                    ปัจจุบัน: {teamName(match.home)} พบ {teamName(match.away)}
                  </p>
                  <div className="tournament-pickers">
                    {(['home', 'away'] as const).map((side) => (
                      <label className="field" key={side}>
                        <span>{side === 'home' ? 'ทีมแรก' : 'ทีมที่สอง'}</span>
                        <select
                          value={choice[side]}
                          onChange={(event) => setChoice(match.id, side, event.target.value)}
                          disabled={!editable || savingId !== null}
                        >
                          <option value="">เลือกทีม</option>
                          <option value={defaults[side].id}>รอผล: {defaults[side].label}</option>
                          {standings.map((row) => (
                            <option key={row.team_id} value={row.team_id}>
                              สาย {row.group_code} · อันดับ {row.rank} · {displayTeam(row)} · {row.points} แต้ม
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {!editable ? <p className="field-hint">คู่นี้เริ่มแข่งหรือมีคะแนนแล้ว จึงเปลี่ยนทีมไม่ได้</p> : null}
                  <div className="tournament-actions">
                    <button
                      type="button"
                      className="btn tournament-confirm"
                      onClick={() => void confirmTeams(match)}
                      disabled={!editable || savingId !== null || !choice.home || !choice.away || choice.home === choice.away || unchanged}
                    >
                      {savingId === match.id ? 'กำลังบันทึก…' : 'บันทึกคู่แข่งขัน'}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => void confirmTeams(match, { home: defaults.home.id, away: defaults.away.id })}
                      disabled={!editable || savingId !== null || alreadyDefault}
                    >
                      คืนเป็นช่องรอผล
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
        </>
      ) : null}
    </div>
  )
}

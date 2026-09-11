import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  FUTSAL_REG_LIMIT,
  POSITION_OPTIONS,
  countTeamRegistrations,
  submitRegistration,
  teamsForSelect,
  uploadPlayerPhoto,
} from '../api/registrationApi'
import type { PlayerPosition, SportType } from '../types/sports'

export function RegisterPage() {
  const { page, sport, setSport } = useApp()
  const [teamId, setTeamId] = useState('')
  const teams = useMemo(() => teamsForSelect(sport), [sport])

  useEffect(() => {
    if (!teams.find((t) => t.id === teamId)) {
      setTeamId(teams[0]?.id ?? '')
    }
  }, [teams, teamId])
  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState<PlayerPosition>('general')
  const [age, setAge] = useState('')
  const [jersey, setJersey] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const isFutsal = sport === 'football'
  const full = isFutsal && count != null && count >= FUTSAL_REG_LIMIT

  useEffect(() => {
    let cancelled = false
    if (!teamId) return
    void countTeamRegistrations(sport, teamId)
      .then((n) => {
        if (!cancelled) setCount(n)
      })
      .catch(() => {
        if (!cancelled) setCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [sport, teamId])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    const ageNum = Number(age)
    if (!fullName.trim()) {
      setErr('กรุณากรอกชื่อ-สกุล')
      return
    }
    if (!Number.isFinite(ageNum) || ageNum < 10 || ageNum > 80) {
      setErr('กรุณากรอกอายุให้ถูกต้อง')
      return
    }
    if (full) {
      setErr('อปท.นี้ลงทะเบียนครบโควต้าแล้ว')
      return
    }

    setBusy(true)
    try {
      let photoUrl: string | undefined
      if (isFutsal && photo) {
        photoUrl = await uploadPlayerPhoto(photo, teamId)
      }
      await submitRegistration({
        sport,
        teamId,
        fullName,
        position,
        age: ageNum,
        jerseyNumber: jersey || undefined,
        photoUrl,
      })
      setMsg('ลงทะเบียนสำเร็จ')
      setFullName('')
      setAge('')
      setJersey('')
      setPhoto(null)
      const n = await countTeamRegistrations(sport, teamId)
      setCount(n)
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'ลงทะเบียนไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  function switchSport(next: SportType) {
    setSport(next)
    setMsg(null)
    setErr(null)
    setPhoto(null)
  }

  return (
    <section className={`page${page === 'register' ? ' active' : ''}`} id="page-register">
      <div className="section-head">
        <div>
          <h1>ลงทะเบียนนักกีฬา</h1>
          <p>วันแข่ง 21 ก.ย. 2569 · ลิงก์สาธารณะ · บันทึกทันที</p>
        </div>
      </div>

      <div className="seg" role="tablist">
        <button
          type="button"
          className={sport === 'football' ? 'active' : ''}
          onClick={() => switchSport('football')}
        >
          ฟุตซอล (ชาย)
        </button>
        <button
          type="button"
          className={sport === 'volleyball' ? 'active' : ''}
          onClick={() => switchSport('volleyball')}
        >
          วอลเลย์ (หญิง)
        </button>
      </div>

      <form className="card reg-form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="reg-team">อปท.</label>
          <select id="reg-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameTh}
              </option>
            ))}
          </select>
          {isFutsal && count != null ? (
            <p className={`reg-quota${full ? ' full' : ''}`}>
              ลงทะเบียนแล้ว {count}/{FUTSAL_REG_LIMIT} คน
              {full ? ' · เต็มแล้ว ไม่รับเพิ่ม' : ''}
            </p>
          ) : null}
          {!isFutsal ? <p className="reg-quota">วอลเลย์ลงทะเบียนได้ไม่จำกัดจำนวน</p> : null}
        </div>

        <div className="field">
          <label htmlFor="reg-name">ชื่อ-สกุล</label>
          <input
            id="reg-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={full}
          />
        </div>

        <div className="field">
          <label htmlFor="reg-pos">ตำแหน่ง</label>
          <select
            id="reg-pos"
            value={position}
            onChange={(e) => setPosition(e.target.value as PlayerPosition)}
            disabled={full}
          >
            {POSITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="reg-age">อายุ</label>
          <input
            id="reg-age"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            disabled={full}
          />
        </div>

        <div className="field">
          <label htmlFor="reg-jersey">เบอร์เสื้อ (ไม่บังคับ)</label>
          <input
            id="reg-jersey"
            value={jersey}
            onChange={(e) => setJersey(e.target.value)}
            disabled={full}
          />
        </div>

        {isFutsal ? (
          <div className="field">
            <label htmlFor="reg-photo">รูป (ไม่บังคับ · ไม่เกิน 2 MB)</label>
            <input
              id="reg-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={full}
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : null}

        {err ? <div className="reg-err">{err}</div> : null}
        {msg ? <div className="reg-ok">{msg}</div> : null}

        <button type="submit" className="reg-submit" disabled={busy || full}>
          {busy ? 'กำลังบันทึก…' : full ? 'โควต้าเต็ม' : 'ลงทะเบียน'}
        </button>
      </form>

      <p className="reg-note">
        {isFutsal
          ? 'ฟุตซอล: ลงสนาม 6 คน (ฝ่ายบริหาร/สภา 2 · อื่นๆ อายุ ≥ 35 ปี อีก 4) · สมัครได้ไม่เกิน 20 คน/อปท.'
          : 'วอลเลย์บอลหญิง · สาย B ไม่มีบาเระใต้ · กติกา 3 เซต เซตละ 15 · ชนะ 2 เซตรวดจบ'}
      </p>
    </section>
  )
}

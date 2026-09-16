import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import {
  RegistrationPosterModal,
  useRegistrationPoster,
} from '../components/RegistrationPosterModal'
import {
  FUTSAL_CONTRACT_MIN_AGE,
  POSITION_OPTIONS,
  REGISTRATION_CLOSED_MESSAGE,
  countTeamRegistrations,
  discardUnregisteredPlayerPhoto,
  isRegistrationOpen,
  submitRegistration,
  teamsForSelect,
  uploadPlayerPhoto,
  validateFutsalAge,
} from '../api/registrationApi'
import type { PlayerPosition, SportType } from '../types/sports'

type RegAlert = { kind: 'ok' | 'err' | 'closed'; message: string }

export function RegisterPage() {
  const { page, sport, setSport, setPage } = useApp()
  const { posterOpen, closePoster } = useRegistrationPoster(page === 'register')
  const [teamId, setTeamId] = useState('')
  const teams = useMemo(() => teamsForSelect(sport), [sport])
  const [nowTick, setNowTick] = useState(() => Date.now())
  const registrationOpen = isRegistrationOpen(new Date(nowTick))

  useEffect(() => {
    if (!teams.find((t) => t.id === teamId)) {
      setTeamId(teams[0]?.id ?? '')
    }
  }, [teams, teamId])

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  const [fullName, setFullName] = useState('')
  const [position, setPosition] = useState<PlayerPosition>('general')
  const [age, setAge] = useState('')
  const [jersey, setJersey] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<RegAlert | null>(null)

  const isFutsal = sport === 'football'
  const contractNeedsAge35 = isFutsal && position === 'contract'
  const formLocked = !registrationOpen

  useEffect(() => {
    let cancelled = false
    if (!teamId || !registrationOpen) return
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
  }, [sport, teamId, registrationOpen])

  useEffect(() => {
    if (page !== 'register') return
    if (registrationOpen) return
    setAlert({ kind: 'closed', message: REGISTRATION_CLOSED_MESSAGE })
  }, [page, registrationOpen])

  function showErr(message: string) {
    setAlert({ kind: 'err', message })
  }

  function dismissAlert() {
    if (!alert) return
    const wasOk = alert.kind === 'ok'
    const wasClosed = alert.kind === 'closed'
    setAlert(null)
    if (wasOk || wasClosed) setPage('home')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isRegistrationOpen()) {
      setAlert({ kind: 'closed', message: REGISTRATION_CLOSED_MESSAGE })
      return
    }
    const ageNum = Number(age)
    if (!fullName.trim()) {
      showErr('กรุณากรอกชื่อ-สกุล')
      return
    }
    if (isFutsal) {
      const ageErr = validateFutsalAge(position, ageNum)
      if (ageErr) {
        showErr(ageErr)
        return
      }
      if (!jersey.trim()) {
        showErr('กรุณากรอกเบอร์เสื้อ')
        return
      }
    } else if (!Number.isFinite(ageNum) || ageNum < 10 || ageNum > 80) {
      showErr('กรุณากรอกอายุให้ถูกต้อง')
      return
    }
    setBusy(true)
    try {
      let uploadedPhoto: Awaited<ReturnType<typeof uploadPlayerPhoto>> | undefined
      if (isFutsal && photo) {
        uploadedPhoto = await uploadPlayerPhoto(photo, teamId)
      }
      try {
        await submitRegistration({
          sport,
          teamId,
          fullName,
          position,
          age: ageNum,
          jerseyNumber: jersey || undefined,
          photoUrl: uploadedPhoto?.publicUrl,
        })
      } catch (submitError) {
        if (uploadedPhoto) await discardUnregisteredPlayerPhoto(uploadedPhoto.path)
        throw submitError
      }
      setFullName('')
      setAge('')
      setJersey('')
      setPhoto(null)
      setCount((n) => (n == null ? n : n + 1))
      setAlert({ kind: 'ok', message: 'ลงทะเบียนนักกีฬาสำเร็จ' })
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : 'ลงทะเบียนไม่สำเร็จ'
      if (msg === REGISTRATION_CLOSED_MESSAGE) {
        setAlert({ kind: 'closed', message: msg })
      } else {
        showErr(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  function onSportChange(next: SportType) {
    setSport(next)
    if (registrationOpen) setAlert(null)
    setPhoto(null)
  }

  return (
    <section className={`page${page === 'register' ? ' active' : ''}`} id="page-register">
      <RegistrationPosterModal open={posterOpen} onClose={closePoster} />

      <div className="section-head">
        <div>
          <h1>ลงทะเบียนนักกีฬา</h1>
          <p>
            {registrationOpen
              ? 'รับถึง 19 ก.ย. 2569 เวลา 17:00 น. · วันแข่ง 21 ก.ย. 2569'
              : 'ปิดรับลงทะเบียนแล้ว · วันแข่ง 21 ก.ย. 2569'}
          </p>
        </div>
      </div>

      {!registrationOpen ? (
        <div className="card reg-closed">
          <h2>หมดเวลาลงทะเบียน</h2>
          <p>{REGISTRATION_CLOSED_MESSAGE}</p>
          <button type="button" className="reg-submit" onClick={() => setPage('home')}>
            กลับหน้าหลัก
          </button>
        </div>
      ) : (
        <>
          <form className="card reg-form" onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="reg-sport">ประเภทกีฬา</label>
              <select
                id="reg-sport"
                value={sport}
                onChange={(e) => onSportChange(e.target.value as SportType)}
              >
                <option value="football">ฟุตซอล (ชาย)</option>
                <option value="volleyball">วอลเลย์บอล (หญิง)</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="reg-team">อปท.</label>
              <select
                id="reg-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={formLocked}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameTh}
                  </option>
                ))}
              </select>
              {isFutsal && count != null ? (
                <p className="reg-quota">ลงทะเบียนแล้ว {count} คน · ไม่จำกัดจำนวน</p>
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
                disabled={formLocked}
              />
            </div>

            <div className="field">
              <label htmlFor="reg-pos">ตำแหน่ง</label>
              <select
                id="reg-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value as PlayerPosition)}
                disabled={formLocked}
              >
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="reg-age">
                อายุ{contractNeedsAge35 ? ` (จ้างเหมา ≥ ${FUTSAL_CONTRACT_MIN_AGE})` : ''}
              </label>
              <input
                id="reg-age"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                disabled={formLocked}
                min={contractNeedsAge35 ? FUTSAL_CONTRACT_MIN_AGE : 10}
                max={80}
              />
              {contractNeedsAge35 ? (
                <p className="reg-quota">จ้างเหมาฟุตซอลต้องอายุ {FUTSAL_CONTRACT_MIN_AGE} ปีขึ้นไป</p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="reg-jersey">เบอร์เสื้อ{isFutsal ? '' : ' (ไม่บังคับ)'}</label>
              <input
                id="reg-jersey"
                value={jersey}
                onChange={(e) => setJersey(e.target.value)}
                required={isFutsal}
                disabled={formLocked}
                inputMode="numeric"
              />
              {isFutsal ? <p className="reg-quota">เบอร์ซ้ำในอปท. เดียวกันไม่ได้</p> : null}
            </div>

            {isFutsal ? (
              <div className="field">
                <label htmlFor="reg-photo">รูป (ไม่บังคับ · ไม่เกิน 2 MB)</label>
                <input
                  id="reg-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={formLocked}
                  onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : null}

            <button type="submit" className="reg-submit" disabled={busy || formLocked}>
              {busy ? 'กำลังบันทึก…' : 'ลงทะเบียนนักกีฬา'}
            </button>
          </form>

          <p className="reg-note">
            {isFutsal
              ? 'ฟุตซอล: ลงสนาม 6 คน (ฝ่ายบริหาร/สภา 2 · อื่นๆ อีก 4) · จ้างเหมาต้องอายุ ≥ 35 · เบอร์เสื้อห้ามซ้ำในอปท. · สมัครได้ไม่จำกัดจำนวน'
              : 'วอลเลย์บอลหญิง · ปิดรับสมัครเฉพาะบาเระใต้ชั่วคราว · กติกา 3 เซต เซตละ 15 · ชนะ 2 เซตรวดจบ'}
          </p>
        </>
      )}

      {alert
        ? createPortal(
            <div className="reg-alert-root">
              <button
                type="button"
                className="scrim show"
                aria-label="ปิด"
                onClick={dismissAlert}
              />
              <div
                className={`reg-alert${alert.kind === 'ok' ? ' ok' : ' err'}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="reg-alert-title"
                aria-describedby="reg-alert-msg"
              >
                <h2 id="reg-alert-title">
                  {alert.kind === 'ok'
                    ? 'สำเร็จ'
                    : alert.kind === 'closed'
                      ? 'หมดเวลาลงทะเบียน'
                      : 'แจ้งเตือน'}
                </h2>
                <p id="reg-alert-msg">{alert.message}</p>
                <button type="button" className="reg-alert-btn" onClick={dismissAlert}>
                  {alert.kind === 'ok' ? 'ตกลง' : 'โอเค'}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}

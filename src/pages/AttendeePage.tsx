import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import {
  RegistrationPosterModal,
  useRegistrationPoster,
} from '../components/RegistrationPosterModal'
import {
  ATTENDEE_POSITION_OPTIONS,
  REGISTRATION_CLOSED_MESSAGE,
  isRegistrationOpen,
  orgOptionsForSelect,
  submitAttendeeRegistration,
  validateAttendeePhone,
  type AttendeePosition,
} from '../api/registrationApi'

type RegAlert = { kind: 'ok' | 'err' | 'closed'; message: string }

export function AttendeePage() {
  const { page, setPage } = useApp()
  const { posterOpen, closePoster } = useRegistrationPoster(page === 'attendee')
  const [nowTick, setNowTick] = useState(() => Date.now())
  const registrationOpen = isRegistrationOpen(new Date(nowTick))
  const orgs = orgOptionsForSelect()

  const [teamId, setTeamId] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState<AttendeePosition | ''>('')
  const [positionOther, setPositionOther] = useState('')
  const [subdistrict, setSubdistrict] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [alert, setAlert] = useState<RegAlert | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (page !== 'attendee') return
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
    if (!teamId) {
      showErr('กรุณาเลือก อปท.')
      return
    }
    if (!fullName.trim()) {
      showErr('กรุณากรอกชื่อ-สกุล')
      return
    }
    const phoneErr = validateAttendeePhone(phone)
    if (phoneErr) {
      showErr(phoneErr)
      return
    }
    if (!position) {
      showErr('กรุณาเลือกตำแหน่ง')
      return
    }
    if (position === 'other' && !positionOther.trim()) {
      showErr('กรุณากรอกตำแหน่ง (เช่น ผู้ใหญ่บ้าน)')
      return
    }

    setBusy(true)
    try {
      await submitAttendeeRegistration({
        teamId,
        fullName,
        phone,
        position,
        positionOther: position === 'other' ? positionOther : undefined,
        subdistrict: subdistrict || undefined,
        note: note || undefined,
      })
      setTeamId('')
      setFullName('')
      setPhone('')
      setPosition('')
      setPositionOther('')
      setSubdistrict('')
      setNote('')
      setAlert({ kind: 'ok', message: 'ลงทะเบียนผู้เข้าร่วมสำเร็จ' })
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

  return (
    <section className={`page${page === 'attendee' ? ' active' : ''}`} id="page-attendee">
      <RegistrationPosterModal open={posterOpen} onClose={closePoster} />

      <div className="section-head">
        <div>
          <h1>ลงทะเบียนผู้เข้าร่วม</h1>
          <p>
            {registrationOpen
              ? 'งานฟุตซอลลีก 21 ก.ย. 2569 · รับถึง 19 ก.ย. 2569 เวลา 17:00 น.'
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
            <p className="reg-quota">
              ฟิลด์เดียวกับชีตลงทะเบียน · ผู้เข้าร่วมงาน (ไม่ใช่นักกีฬาลงสนาม)
            </p>

            <div className="field">
              <label htmlFor="att-org">อปท.</label>
              <select
                id="att-org"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
              >
                <option value="" disabled>
                  — เลือก อปท. —
                </option>
                {orgs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameTh}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="att-name">ชื่อ-สกุล</label>
              <input
                id="att-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="att-phone">เบอร์โทร</label>
              <input
                id="att-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="08x-xxx-xxxx"
              />
            </div>

            <div className="field">
              <label htmlFor="att-pos">ตำแหน่ง</label>
              <select
                id="att-pos"
                value={position}
                onChange={(e) => setPosition(e.target.value as AttendeePosition)}
                required
              >
                <option value="" disabled>
                  — เลือกตำแหน่ง —
                </option>
                {ATTENDEE_POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {position === 'other' ? (
              <div className="field">
                <label htmlFor="att-pos-other">ระบุตำแหน่ง</label>
                <input
                  id="att-pos-other"
                  value={positionOther}
                  onChange={(e) => setPositionOther(e.target.value)}
                  required
                  placeholder="เช่น ผู้ใหญ่บ้าน / กำนัน / อสม."
                />
              </div>
            ) : null}

            <div className="field">
              <label htmlFor="att-sub">ตำบลที่สังกัด (ไม่บังคับ)</label>
              <input
                id="att-sub"
                value={subdistrict}
                onChange={(e) => setSubdistrict(e.target.value)}
                placeholder="ถ้าต่างจาก อปท. ที่เลือก"
              />
            </div>

            <div className="field">
              <label htmlFor="att-note">หมายเหตุ (ไม่บังคับ)</label>
              <input id="att-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>

            <button type="submit" className="reg-submit" disabled={busy}>
              {busy ? 'กำลังบันทึก…' : 'ลงทะเบียนผู้เข้าร่วม'}
            </button>
          </form>

          <p className="reg-note">ปิดรับลงทะเบียน 19 ก.ย. 2569 เวลา 17:00 น.</p>
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
                aria-labelledby="att-alert-title"
                aria-describedby="att-alert-msg"
              >
                <h2 id="att-alert-title">
                  {alert.kind === 'ok'
                    ? 'สำเร็จ'
                    : alert.kind === 'closed'
                      ? 'หมดเวลาลงทะเบียน'
                      : 'แจ้งเตือน'}
                </h2>
                <p id="att-alert-msg">{alert.message}</p>
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

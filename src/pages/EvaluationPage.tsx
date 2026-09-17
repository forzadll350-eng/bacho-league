import { CheckCircle2, ClipboardCheck, LockKeyhole, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  EVALUATION_OPENS_LABEL,
  EVALUATION_QUESTIONS,
  RESPONDENT_TYPES,
  hasSubmittedEvaluationLocally,
  loadEvaluationStatus,
  submitEvaluation,
  type EvaluationScores,
  type EvaluationStatus,
  type RespondentType,
} from '../api/evaluationApi'
import { useApp } from '../context/AppContext'
import { TEAM_LIST } from '../data/teams'

function emptyScores(): EvaluationScores {
  return {
    publicity: 0,
    registration: 0,
    schedule: 0,
    venue: 0,
    officiating: 0,
    liveScore: 0,
    organization: 0,
    overall: 0,
  }
}

export function EvaluationPage() {
  const { page, setPage } = useApp()
  const [status, setStatus] = useState<EvaluationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState('')
  const [respondentType, setRespondentType] = useState<RespondentType | ''>('')
  const [scores, setScores] = useState<EvaluationScores>(emptyScores)
  const [joinAgain, setJoinAgain] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(hasSubmittedEvaluationLocally)

  useEffect(() => {
    if (page !== 'evaluation') return
    let cancelled = false
    const refreshStatus = async () => {
      try {
        const next = await loadEvaluationStatus()
        if (!cancelled) setStatus(next)
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'ตรวจสอบสถานะไม่สำเร็จ')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void refreshStatus()
    const interval = window.setInterval(() => void refreshStatus(), 30_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [page])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!status?.isOpen) {
      setError('ระบบประเมินยังไม่เปิดหรือถูกปิดรับแล้ว')
      return
    }
    if (!teamId) {
      setError('กรุณาเลือก อปท. ที่สังกัดหรือเกี่ยวข้อง')
      return
    }
    if (!respondentType) {
      setError('กรุณาเลือกประเภทผู้ตอบแบบประเมิน')
      return
    }
    const unanswered = EVALUATION_QUESTIONS.find((question) => scores[question.key] === 0)
    if (unanswered) {
      setError(`กรุณาให้คะแนนหัวข้อ “${unanswered.label}”`)
      return
    }
    if (joinAgain == null) {
      setError('กรุณาระบุว่าต้องการเข้าร่วมโครงการครั้งต่อไปหรือไม่')
      return
    }

    setBusy(true)
    try {
      await submitEvaluation({
        teamId,
        respondentType,
        scores,
        joinAgain,
        comment: comment.trim(),
      })
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'ส่งแบบประเมินไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`page${page === 'evaluation' ? ' active' : ''}`} id="page-evaluation">
      <div className="evaluation-head">
        <div>
          <span>โครงการสายใยสัมพันธ์ 2569</span>
          <h1>ประเมินความพึงพอใจ</h1>
          <p>ไม่เก็บชื่อหรือเบอร์โทร · ใช้เวลาประมาณ 2 นาที</p>
        </div>
        <ClipboardCheck size={28} strokeWidth={1.6} aria-hidden />
      </div>

      {loading ? (
        <div className="card evaluation-state" aria-live="polite">กำลังตรวจสอบสถานะ…</div>
      ) : submitted ? (
        <div className="card evaluation-state evaluation-success" aria-live="polite">
          <CheckCircle2 size={34} aria-hidden />
          <h2>บันทึกแบบประเมินแล้ว</h2>
          <p>ขอบคุณที่ช่วยให้ผู้จัดนำความคิดเห็นไปปรับปรุงโครงการครั้งต่อไป</p>
          <button type="button" className="evaluation-submit" onClick={() => setPage('home')}>
            กลับหน้าหลัก
          </button>
        </div>
      ) : !status?.isOpen ? (
        <div className="card evaluation-state evaluation-locked">
          <LockKeyhole size={30} aria-hidden />
          <h2>{status?.manuallyClosed ? 'ปิดรับแบบประเมินแล้ว' : 'ระบบยังไม่เปิด'}</h2>
          <p>
            {status?.manuallyClosed
              ? 'ผู้จัดงานปิดรับคำตอบแล้ว'
              : `เปิดรับวันที่ ${EVALUATION_OPENS_LABEL}`}
          </p>
          <button type="button" className="evaluation-secondary" onClick={() => setPage('home')}>
            กลับหน้าหลัก
          </button>
        </div>
      ) : (
        <form className="evaluation-form" onSubmit={onSubmit} noValidate>
          <section className="card evaluation-step">
            <header>
              <span className="evaluation-step-number">1 / 3</span>
              <div>
                <h2>ข้อมูลทั่วไป</h2>
                <p>ใช้เพื่อสรุปผลแยกกลุ่ม ไม่ใช้ระบุตัวบุคคล</p>
              </div>
            </header>
            <label className="evaluation-field">
              <span>อปท. ที่สังกัดหรือเกี่ยวข้อง</span>
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                aria-required="true"
              >
                <option value="">เลือก อปท.</option>
                {TEAM_LIST.map((team) => (
                  <option key={team.id} value={team.id}>{team.nameTh}</option>
                ))}
              </select>
            </label>
            <label className="evaluation-field">
              <span>ประเภทผู้ตอบ</span>
              <select
                value={respondentType}
                onChange={(event) => setRespondentType(event.target.value as RespondentType | '')}
                aria-required="true"
              >
                <option value="">เลือกประเภทผู้ตอบ</option>
                {RESPONDENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="card evaluation-step">
            <header>
              <span className="evaluation-step-number">2 / 3</span>
              <div>
                <h2>ให้คะแนนการจัดงาน</h2>
                <p>1 = น้อยที่สุด · 5 = มากที่สุด</p>
              </div>
            </header>
            <div className="evaluation-question-list">
              {EVALUATION_QUESTIONS.map((question, questionIndex) => (
                <fieldset className="evaluation-question" key={question.key}>
                  <legend>
                    <span>{String(questionIndex + 1).padStart(2, '0')}</span>
                    {question.label}
                  </legend>
                  <div className="evaluation-rating">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <label key={score} className={scores[question.key] === score ? 'selected' : ''}>
                        <input
                          type="radio"
                          name={`score-${question.key}`}
                          value={score}
                          checked={scores[question.key] === score}
                          onChange={() => setScores((current) => ({ ...current, [question.key]: score }))}
                          aria-label={`${question.label} ${score} คะแนน`}
                        />
                        <span>{score}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="card evaluation-step">
            <header>
              <span className="evaluation-step-number">3 / 3</span>
              <div>
                <h2>ความคิดเห็นเพิ่มเติม</h2>
                <p>ช่วยบอกสิ่งที่ควรรักษาไว้หรือควรปรับปรุง</p>
              </div>
            </header>
            <fieldset className="evaluation-return">
              <legend>ต้องการเข้าร่วมโครงการครั้งต่อไปหรือไม่</legend>
              <div>
                <label className={joinAgain === true ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="join-again"
                    checked={joinAgain === true}
                    onChange={() => setJoinAgain(true)}
                  />
                  <span>ต้องการ</span>
                </label>
                <label className={joinAgain === false ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="join-again"
                    checked={joinAgain === false}
                    onChange={() => setJoinAgain(false)}
                  />
                  <span>ไม่ต้องการ</span>
                </label>
              </div>
            </fieldset>
            <label className="evaluation-field">
              <span>ข้อเสนอแนะ (ไม่บังคับ)</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 1000))}
                rows={5}
                placeholder="สิ่งที่ชอบ หรือสิ่งที่อยากให้ปรับปรุง"
              />
              <small>{comment.length} / 1,000</small>
            </label>
          </section>

          <div className="evaluation-privacy">
            ระบบใช้รหัสอุปกรณ์แบบเข้ารหัสเพื่อป้องกันการส่งซ้ำ และไม่เก็บชื่อ เบอร์โทร หรือข้อมูลตำแหน่งที่อยู่
          </div>
          {error ? <div className="evaluation-error" role="alert">{error}</div> : null}
          <button type="submit" className="evaluation-submit" disabled={busy}>
            <Send size={17} aria-hidden />
            {busy ? 'กำลังบันทึก…' : 'ส่งแบบประเมิน'}
          </button>
        </form>
      )}
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ShieldCheck, X } from 'lucide-react'
import {
  FOOTBALL_RULE_SECTIONS,
  PRIVACY_NOTICE_SECTIONS,
} from '../data/registrationLegal'
import type { SportType } from '../types/sports'

type ConsentResult = {
  rulesAccepted: boolean
  privacyAcknowledged: true
  publicRosterConsent: true
}

type Props = {
  sport: SportType
  busy: boolean
  onCancel: () => void
  onConfirm: (result: ConsentResult) => void
}

export function RegistrationConsentModal({ sport, busy, onCancel, onConfirm }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [reachedEnd, setReachedEnd] = useState(false)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)
  const [publicRosterConsent, setPublicRosterConsent] = useState(false)
  const isFootball = sport === 'football'

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function detectEnd() {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setReachedEnd(true)
  }

  const canConfirm =
    reachedEnd &&
    privacyAcknowledged &&
    publicRosterConsent &&
    (!isFootball || rulesAccepted) &&
    !busy

  return createPortal(
    <div className="consent-root" role="presentation">
      <button
        type="button"
        className="consent-scrim"
        aria-label="ปิดหน้าต่าง"
        onClick={busy ? undefined : onCancel}
      />
      <section
        className="consent-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        <header className="consent-head">
          <div>
            <span className="consent-kicker">
              {isFootball ? 'ระเบียบฟุตซอลและ PDPA' : 'ประกาศ PDPA'}
            </span>
            <h2 id="consent-title">อ่านและยืนยันก่อนลงทะเบียน</h2>
          </div>
          <button type="button" aria-label="ปิด" onClick={onCancel} disabled={busy}>
            <X size={19} />
          </button>
        </header>

        <div className="consent-scroll" ref={scrollRef} onScroll={detectEnd} tabIndex={0}>
          {isFootball ? (
            <article className="legal-block">
              <div className="legal-title-row">
                <span className="legal-index">01</span>
                <div>
                  <p>เฉพาะผู้สมัครฟุตซอล</p>
                  <h3>ระเบียบการแข่งขัน</h3>
                </div>
              </div>
              {FOOTBALL_RULE_SECTIONS.map((section) => (
                <section className="legal-section" key={section.title}>
                  <h4>{section.title}</h4>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </section>
              ))}
            </article>
          ) : null}

          <article className="legal-block">
            <div className="legal-title-row">
              <span className="legal-index">{isFootball ? '02' : '01'}</span>
              <div>
                <p>การคุ้มครองข้อมูลส่วนบุคคล</p>
                <h3>ประกาศความเป็นส่วนตัว</h3>
              </div>
            </div>
            {PRIVACY_NOTICE_SECTIONS.map((section) => (
              <section className="legal-section" key={section.title}>
                <h4>{section.title}</h4>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </article>

          <div className="legal-end" aria-label="อ่านเอกสารครบแล้ว">
            <Check size={17} />
            สิ้นสุดเอกสาร
          </div>
        </div>

        <footer className="consent-foot">
          {!reachedEnd ? (
            <p className="scroll-hint">
              <ChevronDown size={15} /> เลื่อนอ่านให้ถึงท้ายเอกสารเพื่อเปิดการยืนยัน
            </p>
          ) : (
            <div className="consent-checks">
              {isFootball ? (
                <label>
                  <input
                    type="checkbox"
                    checked={rulesAccepted}
                    onChange={(event) => setRulesAccepted(event.target.checked)}
                  />
                  <span>ข้าพเจ้าอ่านและยอมรับระเบียบการแข่งขันฟุตซอลทั้งหมด</span>
                </label>
              ) : null}
              <label>
                <input
                  type="checkbox"
                  checked={privacyAcknowledged}
                  onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
                />
                <span>ข้าพเจ้าอ่านและรับทราบประกาศความเป็นส่วนตัวแล้ว</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={publicRosterConsent}
                  onChange={(event) => setPublicRosterConsent(event.target.checked)}
                />
                <span>
                  ข้าพเจ้ายินยอมให้แสดงชื่อ-สกุล อปท./ทีม ประเภทกีฬา และเบอร์เสื้อฟุตซอล
                  ในหน้ารายชื่อนักกีฬาสาธารณะ
                </span>
              </label>
            </div>
          )}
          <button
            type="button"
            className="reg-submit consent-confirm"
            disabled={!canConfirm}
            onClick={() =>
              onConfirm({
                rulesAccepted,
                privacyAcknowledged: true,
                publicRosterConsent: true,
              })
            }
          >
            <ShieldCheck size={17} />
            {busy ? 'กำลังบันทึก…' : 'ยอมรับและยืนยันลงทะเบียน'}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  )
}

import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import './GoalScorerDialog.css'

export type ScorerCandidate = {
  id: string
  name: string
  jerseyNumber: string
}

export type ScorerChoice = {
  jerseyNumber: string
  playerName: string | null
  registrationId: string | null
}

type Props = {
  teamName: string
  minute: number
  candidates: ScorerCandidate[]
  canUndoGoal?: boolean
  onChoose: (choice: ScorerChoice) => void
  onLater: () => void
  onUndoGoal?: () => void
}

export function GoalScorerDialog({
  teamName,
  minute,
  candidates,
  canUndoGoal = false,
  onChoose,
  onLater,
  onUndoGoal,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onLaterRef = useRef(onLater)
  const [query, setQuery] = useState('')
  const [manualNumber, setManualNumber] = useState('')
  const [manualTouched, setManualTouched] = useState(false)

  useEffect(() => {
    onLaterRef.current = onLater
  }, [onLater])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleCancel = (event: Event) => {
      event.preventDefault()
      onLaterRef.current()
    }
    dialog.addEventListener('cancel', handleCancel)
    dialog.showModal()
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
      if (dialog.open) dialog.close()
    }
  }, [])

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('th')
    if (!normalized) return candidates
    return candidates.filter(
      (candidate) =>
        candidate.jerseyNumber.toLocaleLowerCase('th').includes(normalized) ||
        candidate.name.toLocaleLowerCase('th').includes(normalized),
    )
  }, [candidates, query])

  const manualError = manualTouched && !manualNumber.trim()

  function chooseManualNumber() {
    setManualTouched(true)
    const jerseyNumber = manualNumber.trim()
    if (!jerseyNumber) return
    onChoose({ jerseyNumber, playerName: null, registrationId: null })
  }

  return (
    <dialog
      ref={dialogRef}
      className="scorer-dialog"
      aria-labelledby="scorer-dialog-title"
      onClick={(event) => {
        if (event.target === dialogRef.current) onLater()
      }}
    >
      <div className="scorer-dialog__sheet">
        <header className="scorer-dialog__header">
          <div>
            <p>เพิ่มประตู · นาที {minute}'</p>
            <h2 id="scorer-dialog-title">ใครเป็นผู้ยิง?</h2>
            <span>{teamName}</span>
          </div>
          <button
            type="button"
            className="scorer-dialog__close"
            aria-label="ปิดและระบุผู้ยิงภายหลัง"
            onClick={onLater}
          >
            <X size={20} />
          </button>
        </header>

        <label className="scorer-search">
          <span className="scorer-search__label">ค้นหาชื่อหรือเบอร์เสื้อ</span>
          <span className="scorer-search__control">
            <Search size={17} aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="เช่น 9 หรือชื่อผู้เล่น"
            />
          </span>
        </label>

        <div className="scorer-candidates" aria-live="polite">
          {filteredCandidates.length === 0 ? (
            <p className="scorer-empty">ไม่พบรายชื่อ ใช้ช่องกรอกเบอร์เสื้อด้านล่างได้</p>
          ) : (
            filteredCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="scorer-candidate"
                onClick={() =>
                  onChoose({
                    jerseyNumber: candidate.jerseyNumber,
                    playerName: candidate.name,
                    registrationId: candidate.id,
                  })
                }
              >
                <strong>#{candidate.jerseyNumber}</strong>
                <span>{candidate.name}</span>
              </button>
            ))
          )}
        </div>

        <form
          className={`scorer-manual${manualError ? ' is-error' : ''}`}
          onSubmit={(event) => {
            event.preventDefault()
            chooseManualNumber()
          }}
        >
          <label htmlFor="manual-jersey-number">ไม่มีในรายชื่อ — กรอกเบอร์เสื้อ</label>
          <div className="scorer-manual__row">
            <input
              id="manual-jersey-number"
              value={manualNumber}
              inputMode="numeric"
              onBlur={() => setManualTouched(true)}
              onChange={(event) => {
                setManualNumber(event.target.value)
                if (manualTouched) setManualTouched(true)
              }}
              aria-invalid={manualError}
              aria-describedby="manual-jersey-help"
              placeholder="เช่น 10"
            />
            <button type="submit">ใช้เบอร์นี้</button>
          </div>
          <p id="manual-jersey-help" role={manualError ? 'alert' : undefined}>
            {manualError ? 'ยังไม่ได้กรอกเบอร์เสื้อ กรุณากรอกแล้วลองอีกครั้ง' : 'ชื่อสามารถแก้ไขภายหลังได้'}
          </p>
        </form>

        <footer className="scorer-dialog__actions">
          <button type="button" className="btn secondary" onClick={onLater}>
            ระบุภายหลัง
          </button>
          {canUndoGoal && onUndoGoal ? (
            <button type="button" className="scorer-dialog__undo" onClick={onUndoGoal}>
              ยกเลิกประตูนี้
            </button>
          ) : null}
        </footer>
      </div>
    </dialog>
  )
}

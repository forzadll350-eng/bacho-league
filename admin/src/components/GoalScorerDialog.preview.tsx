import './GoalScorerDialog.css'

const states = [
  ['default', 'ผู้เล่นหมายเลข 9'],
  ['is-hover', 'ผู้เล่นหมายเลข 9'],
  ['is-focus', 'ผู้เล่นหมายเลข 9'],
  ['is-active', 'ผู้เล่นหมายเลข 9'],
  ['is-disabled', 'ผู้เล่นหมายเลข 9'],
  ['is-loading', 'กำลังบันทึก…'],
  ['is-error', 'ยังไม่ได้เลือกผู้ยิง'],
  ['is-success', 'เลือกผู้ยิงแล้ว'],
] as const

/** Development-only visual checklist for the scorer option's eight interaction states. */
export function GoalScorerDialogPreview() {
  return (
    <section aria-label="Goal scorer dialog states">
      {states.map(([state, label]) => (
        <div key={state} style={{ marginBlock: 8 }}>
          <small>{state}</small>
          <button
            type="button"
            className={`scorer-candidate ${state}`}
            disabled={state === 'is-disabled'}
          >
            <strong>#9</strong>
            <span>{label}</span>
          </button>
        </div>
      ))}
    </section>
  )
}

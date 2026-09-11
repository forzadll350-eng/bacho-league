import { useState } from 'react'
import type { MatchGoal } from '../types/sports'

function goalLabel(g: MatchGoal) {
  const name = g.playerName?.trim() || `เบอร์ ${g.jerseyNumber}`
  const minute = g.minuteApprox != null ? ` ${g.minuteApprox}'` : ''
  return `${name}${minute}`
}

export function GoalChips({
  goals,
  homeTeamId,
}: {
  goals: MatchGoal[]
  homeTeamId: string
}) {
  const [preview, setPreview] = useState<MatchGoal | null>(null)

  if (!goals.length) return null

  const homeGoals = goals.filter((g) => g.teamId === homeTeamId)
  const awayGoals = goals.filter((g) => g.teamId !== homeTeamId)

  return (
    <>
      <div className="goal-board" aria-label="ผู้ยิง">
        <div className="goal-board-side">
          {homeGoals.map((g) => (
            <GoalLine
              key={g.id}
              goal={g}
              side="home"
              onOpen={() => {
                window.getSelection()?.removeAllRanges()
                setPreview(g)
              }}
            />
          ))}
        </div>
        <div className="goal-board-ball" aria-hidden>
          ⚽
        </div>
        <div className="goal-board-side away">
          {awayGoals.map((g) => (
            <GoalLine
              key={g.id}
              goal={g}
              side="away"
              onOpen={() => {
                window.getSelection()?.removeAllRanges()
                setPreview(g)
              }}
            />
          ))}
        </div>
      </div>

      {preview ? (
        <>
          <button
            type="button"
            className="scrim show"
            aria-label="ปิด"
            onClick={() => setPreview(null)}
          />
          <div className="player-preview" role="dialog" aria-modal="true" aria-label="รายละเอียดผู้ยิง">
            <button type="button" className="text-btn player-preview-close" onClick={() => setPreview(null)}>
              ปิด
            </button>
            {preview.photoUrl ? (
              <img src={preview.photoUrl} alt="" className="player-preview-photo" draggable={false} />
            ) : (
              <div className="player-preview-jersey">#{preview.jerseyNumber}</div>
            )}
            <div className="player-preview-name">
              {preview.playerName ?? `เบอร์ ${preview.jerseyNumber}`}
            </div>
            <div className="player-preview-meta">
              เบอร์ {preview.jerseyNumber}
              {preview.minuteApprox != null ? ` · นาที ~${preview.minuteApprox}'` : ''}
            </div>
          </div>
        </>
      ) : null}
    </>
  )
}

function GoalLine({
  goal,
  side,
  onOpen,
}: {
  goal: MatchGoal
  side: 'home' | 'away'
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className={`goal-line ${side}`}
      onClick={(e) => {
        e.currentTarget.blur()
        onOpen()
      }}
    >
      {side === 'home' ? <GoalAvatar goal={goal} /> : null}
      <span className="goal-line-text">{goalLabel(goal)}</span>
      {side === 'away' ? <GoalAvatar goal={goal} /> : null}
    </button>
  )
}

function GoalAvatar({ goal }: { goal: MatchGoal }) {
  if (goal.photoUrl) {
    return <img src={goal.photoUrl} alt="" className="goal-line-photo" />
  }
  return <span className="goal-line-badge">#{goal.jerseyNumber}</span>
}

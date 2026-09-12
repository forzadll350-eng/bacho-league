import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Match } from '../types/sports'
import { VictoryShareSheet } from './VictoryShareSheet'
import { closeMatchShare, subscribeMatchShare } from '../lib/matchShare'

export function MatchShareHost() {
  const [match, setMatch] = useState<Match | null>(null)

  useEffect(() => subscribeMatchShare(setMatch), [])

  if (!match) return null

  return createPortal(
    <VictoryShareSheet match={match} onClose={closeMatchShare} />,
    document.body,
  )
}

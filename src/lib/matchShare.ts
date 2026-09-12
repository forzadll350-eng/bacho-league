import type { Match } from '../types/sports'

type Listener = (match: Match | null) => void

let current: Match | null = null
const listeners = new Set<Listener>()

/** A result card can only be generated/shared once the match is finished. */
export function canShareMatch(match: Match): boolean {
  return match.status === 'finished'
}

export function openMatchShare(match: Match) {
  if (!canShareMatch(match)) return
  current = match
  listeners.forEach((l) => l(current))
}

export function closeMatchShare() {
  current = null
  listeners.forEach((l) => l(null))
}

export function getMatchShare(): Match | null {
  return current
}

export function subscribeMatchShare(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}

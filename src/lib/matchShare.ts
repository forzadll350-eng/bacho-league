import type { Match } from '../types/sports'

type Listener = (match: Match | null) => void

let current: Match | null = null
const listeners = new Set<Listener>()

export function openMatchShare(match: Match) {
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

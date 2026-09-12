import type { Match } from '../types/sports'

export function compareMatchOrder(a: Match, b: Match): number {
  const orderA = a.matchOrder ?? Number.MAX_SAFE_INTEGER
  const orderB = b.matchOrder ?? Number.MAX_SAFE_INTEGER
  if (orderA !== orderB) return orderA - orderB

  const timeA = new Date(a.scheduledAt).getTime()
  const timeB = new Date(b.scheduledAt).getTime()
  if (timeA !== timeB) return timeA - timeB
  return a.id.localeCompare(b.id)
}

export function matchOrderLabel(match: Match): string {
  return match.matchOrder ? `นัดที่ ${match.matchOrder}` : 'ไม่ระบุเวลา'
}

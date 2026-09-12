/** นาฬิกานัด — นับจากเวลาเริ่มแข่งเป็นนาที:วินาที */

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function formatElapsedClock(scheduledAt: string, nowMs = Date.now()): string {
  const start = new Date(scheduledAt).getTime()
  if (Number.isNaN(start)) return '0:00'
  const elapsed = Math.max(0, Math.floor((nowMs - start) / 1000))
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  return `${m}:${pad2(s)}`
}

export function isMatchPlaying(status: string | undefined): boolean {
  return status === 'live' || status === 'halftime'
}

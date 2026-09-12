import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import type { Match } from '../types/sports'

export type GoalBurstPayload = {
  id: string
  teamName: string
  scoreline: string
  sport: 'football' | 'volleyball'
}

const BURST_MS = 4200

type ScoreSnap = { home: number; away: number; goals: number }

function snapMatches(matches: Match[]): Map<string, ScoreSnap> {
  const map = new Map<string, ScoreSnap>()
  for (const m of matches) {
    map.set(m.id, {
      home: m.homeScore,
      away: m.awayScore,
      goals: m.goals?.length ?? 0,
    })
  }
  return map
}

function detectBurst(
  prev: Map<string, ScoreSnap> | null,
  matches: Match[],
  sport: 'football' | 'volleyball',
): GoalBurstPayload | null {
  if (!prev || prev.size === 0) return null
  for (const m of matches) {
    const old = prev.get(m.id)
    if (!old) continue
    const scoreUp = m.homeScore + m.awayScore > old.home + old.away
    const goalsUp = (m.goals?.length ?? 0) > old.goals
    if (!scoreUp && !goalsUp) continue

    const homeUp = m.homeScore > old.home
    const awayUp = m.awayScore > old.away
    let teamName = m.homeTeam.nameTh
    if (homeUp && !awayUp) teamName = m.homeTeam.nameTh
    else if (awayUp && !homeUp) teamName = m.awayTeam.nameTh
    else if (goalsUp && m.goals && m.goals.length > 0) {
      const last = m.goals[m.goals.length - 1]
      if (last.teamId === m.awayTeam.id) teamName = m.awayTeam.nameTh
      else if (last.teamId === m.homeTeam.id) teamName = m.homeTeam.nameTh
    }

    return {
      id: `${m.id}-${m.homeScore}-${m.awayScore}-${m.goals?.length ?? 0}-${Date.now()}`,
      teamName,
      scoreline: `${m.homeScore} - ${m.awayScore}`,
      sport,
    }
  }
  return null
}

function FireworksCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(window.innerHeight * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    type Particle = {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      max: number
      hue: number
      size: number
    }
    const particles: Particle[] = []

    const burst = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4
        const spd = 2.5 + Math.random() * 5.5
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.2,
          life: 0,
          max: 50 + Math.random() * 40,
          hue: Math.floor(Math.random() * 60) + (i % 2 === 0 ? 35 : 0),
          size: 2 + Math.random() * 3.5,
        })
      }
    }

    const w = () => window.innerWidth
    const h = () => window.innerHeight
    burst(w() * 0.5, h() * 0.38, 56)
    burst(w() * 0.28, h() * 0.32, 36)
    burst(w() * 0.72, h() * 0.34, 36)
    const t1 = window.setTimeout(() => burst(w() * 0.4, h() * 0.28, 40), 280)
    const t2 = window.setTimeout(() => burst(w() * 0.6, h() * 0.3, 40), 480)

    const tick = () => {
      if (!running) return
      ctx.clearRect(0, 0, w(), h())
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += 1
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.06
        p.vx *= 0.992
        const alpha = Math.max(0, 1 - p.life / p.max)
        if (alpha <= 0) {
          particles.splice(i, 1)
          continue
        }
        ctx.beginPath()
        ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${alpha})`
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.fillStyle = `hsla(${p.hue}, 100%, 85%, ${alpha * 0.7})`
        ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  return <canvas ref={canvasRef} className="goal-burst-canvas" aria-hidden />
}

function BurstOverlay({
  burst,
  onDone,
}: {
  burst: GoalBurstPayload
  onDone: () => void
}) {
  const titleId = useId()
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current(), BURST_MS)
    return () => window.clearTimeout(id)
  }, [burst.id])

  const headline = burst.sport === 'volleyball' ? 'ได้เซต!' : 'ยิงเข้า!'

  return createPortal(
    <div className="goal-burst" role="status" aria-live="assertive" aria-labelledby={titleId}>
      <div className="goal-burst-scrim" aria-hidden />
      <FireworksCanvas active />
      <div className="goal-burst-card">
        <p className="goal-burst-kicker">GOALLLL</p>
        <h2 id={titleId}>{headline}</h2>
        <p className="goal-burst-team">{burst.teamName}</p>
        <p className="goal-burst-score sports-num">{burst.scoreline}</p>
      </div>
    </div>,
    document.body,
  )
}

/** ฟังสกอร์ realtime แล้วฉลองพลุทั้งแอป */
export function GoalCelebrationHost() {
  const { data, sport, loading } = useApp()
  const prevRef = useRef<Map<string, ScoreSnap> | null>(null)
  const armedRef = useRef(false)
  const [burst, setBurst] = useState<GoalBurstPayload | null>(null)

  useEffect(() => {
    armedRef.current = false
    prevRef.current = null
  }, [sport])

  useEffect(() => {
    // รอโหลดรอบแรกให้จบก่อนค่อยเริ่มเทียบสกอร์ (กันพลุตอนเปิดแอป)
    if (loading && !armedRef.current) return

    const matches = data.matches
    if (!armedRef.current) {
      if (loading) return
      prevRef.current = snapMatches(matches)
      armedRef.current = true
      return
    }

    // ตอนกำลัง reload อย่าทับ prev — รอข้อมูลชุดใหม่แล้วค่อยเทียบ
    if (loading) return

    const found = detectBurst(prevRef.current, matches, sport)
    prevRef.current = snapMatches(matches)
    if (found) setBurst(found)
  }, [data.matches, loading, sport])

  if (!burst) return null
  return <BurstOverlay key={burst.id} burst={burst} onDone={() => setBurst(null)} />
}

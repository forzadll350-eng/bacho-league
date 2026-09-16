import { Copy, Download, Film, MessageCircle, Share2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { Match, Team } from '../types/sports'
import { LEAGUE } from '../data/teams'

type VictoryPayload = {
  winner: Team
  loser: Team
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  winnerScore: number
  loserScore: number
  isDraw: boolean
  crestUrl: string
  resultMark: 'WINNER' | 'DRAW'
  sportLabel: string
  isPreview: boolean
  isFinal: boolean
  groupLabel: string
  kickoffLabel: string
}

function resolveVictory(match: Match): VictoryPayload {
  const isFinal = match.stage === 'final'
  const groupLabel = isFinal
    ? 'นัดชิงชนะเลิศ'
    : match.stage === 'third'
      ? 'ชิงอันดับ 3'
      : match.groupCode
        ? `สาย ${match.groupCode}${match.courtLabel ? ` · ${match.courtLabel}` : ''}`
        : match.courtLabel || match.periodLabel || 'การแข่งขัน'
  const kickoffLabel = new Date(match.scheduledAt).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const homeScore = match.homeScore
  const awayScore = match.awayScore
  const homeWins = homeScore > awayScore
  const awayWins = awayScore > homeScore
  const hasResult =
    match.status === 'finished' || match.status === 'live' || match.status === 'halftime'
  const isDraw = hasResult && !homeWins && !awayWins
  const winner = homeWins ? match.homeTeam : awayWins ? match.awayTeam : match.homeTeam
  const loser = homeWins ? match.awayTeam : awayWins ? match.homeTeam : match.awayTeam

  return {
    homeName: match.homeTeam.nameTh,
    awayName: match.awayTeam.nameTh,
    isFinal,
    groupLabel,
    kickoffLabel,
    winner,
    loser,
    homeScore,
    awayScore,
    winnerScore: Math.max(homeScore, awayScore),
    loserScore: Math.min(homeScore, awayScore),
    isDraw,
    crestUrl: isDraw ? LEAGUE.crestUrl : winner.crestUrl,
    resultMark: isDraw ? 'DRAW' : 'WINNER',
    sportLabel: match.sport === 'volleyball' ? 'วอลเลย์บอลหญิง' : 'ฟุตซอลลีก',
    // ตัวอย่างเฉพาะตอนยังไม่มีผลชัด (รอแข่ง / เสมอตอนยังไม่จบ)
    isPreview: !hasResult || (!homeWins && !awayWins && match.status !== 'finished'),
  }
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function drawVictoryFrame(
  ctx: CanvasRenderingContext2D,
  payload: VictoryPayload,
  crest: HTMLImageElement | null,
  t: number,
) {
  const W = 1080
  const H = 1920
  const cx = W / 2

  const g = ctx.createLinearGradient(0, 0, W, H)
  if (payload.isFinal) {
    g.addColorStop(0, '#120e08')
    g.addColorStop(0.4, '#1c1408')
    g.addColorStop(1, '#050301')
  } else {
    g.addColorStop(0, '#0a0908')
    g.addColorStop(0.45, '#16120e')
    g.addColorStop(1, '#050403')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const pulse = 0.22 + Math.sin(t * Math.PI * 2) * 0.08
  const glow = ctx.createRadialGradient(cx, H * 0.36, 30, cx, H * 0.36, payload.isFinal ? 620 : 500)
  glow.addColorStop(0, `rgba(255, 198, 92, ${pulse + (payload.isFinal ? 0.12 : 0)})`)
  glow.addColorStop(0.5, 'rgba(255, 120, 40, 0.1)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // floating sparks
  for (let i = 0; i < (payload.isFinal ? 28 : 16); i++) {
    const a = (i / 16) * Math.PI * 2 + t * 2.2
    const r = 180 + (i % 5) * 48 + Math.sin(t * 4 + i) * 18
    const x = cx + Math.cos(a) * r
    const y = H * 0.34 + Math.sin(a * 1.3) * (r * 0.35)
    ctx.beginPath()
    ctx.fillStyle = `rgba(255, 210, 120, ${0.25 + (i % 3) * 0.2})`
    ctx.arc(x, y, payload.isFinal ? 4 : 3, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '500 34px "IBM Plex Sans Thai", sans-serif'
  ctx.fillText(payload.sportLabel, cx, 120)
  ctx.fillStyle = payload.isFinal ? '#ffd27a' : 'rgba(255,198,92,0.95)'
  ctx.font = payload.isFinal
    ? '800 42px "IBM Plex Sans Thai", sans-serif'
    : '600 30px "IBM Plex Sans Thai", sans-serif'
  ctx.fillText(payload.groupLabel, cx, 175)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '400 26px "IBM Plex Sans Thai", sans-serif'
  ctx.fillText(payload.kickoffLabel, cx, 220)

  const crestSize = payload.isFinal ? 460 : 400
  const cy = payload.isFinal ? 600 : 580
  const ringPulse = 1 + Math.sin(t * Math.PI * 2) * 0.04
  ctx.beginPath()
  ctx.arc(cx, cy, (crestSize / 2 + (payload.isFinal ? 40 : 28)) * ringPulse, 0, Math.PI * 2)
  ctx.strokeStyle = payload.isFinal ? 'rgba(255, 214, 120, 0.75)' : 'rgba(255,198,92,0.55)'
  ctx.lineWidth = payload.isFinal ? 8 : 6
  ctx.stroke()
  if (payload.isFinal) {
    ctx.beginPath()
    ctx.arc(cx, cy, crestSize / 2 + 58, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(255, 180, 60, 0.25)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  if (crest) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, crestSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(crest, cx - crestSize / 2, cy - crestSize / 2, crestSize, crestSize)
    ctx.restore()
  }

  // WINNER wordmark
  const winnerY = cy + crestSize / 2 + (payload.isFinal ? 110 : 95)
  const winnerScale = 0.92 + Math.min(1, t * 2.2) * 0.08
  ctx.save()
  ctx.translate(cx, winnerY)
  ctx.scale(winnerScale, winnerScale)
  ctx.shadowColor = 'rgba(255, 190, 70, 0.65)'
  ctx.shadowBlur = payload.isFinal ? 36 : 22
  const winnerGrad = ctx.createLinearGradient(0, -40, 0, 40)
  winnerGrad.addColorStop(0, '#fff6d8')
  winnerGrad.addColorStop(0.45, '#ffd36a')
  winnerGrad.addColorStop(1, '#e08a20')
  ctx.fillStyle = winnerGrad
  ctx.font = payload.isFinal
    ? '900 92px "IBM Plex Sans", Impact, sans-serif'
    : '900 72px "IBM Plex Sans", Impact, sans-serif'
  ctx.fillText(payload.resultMark, 0, 0)
  ctx.restore()

  const scoreY = winnerY + (payload.isFinal ? 150 : 130)
  const scoreText = `${payload.homeScore} - ${payload.awayScore}`
  ctx.fillStyle = '#fff'
  ctx.font = payload.isFinal
    ? '800 132px "IBM Plex Sans", sans-serif'
    : '800 118px "IBM Plex Sans", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(scoreText, cx, scoreY)

  const matchupY = scoreY + (payload.isFinal ? 78 : 70)
  drawMatchupLine(ctx, payload.homeName, payload.awayName, cx, matchupY, W - 120)

  ctx.fillStyle = 'rgba(255,198,92,0.8)'
  ctx.font = '500 28px "IBM Plex Sans Thai", sans-serif'
  ctx.fillText(LEAGUE.taglineTh, cx, 1760)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.font = '400 24px "IBM Plex Sans Thai", sans-serif'
  ctx.fillText(payload.isFinal ? 'CHAMPIONS · Stories / Reels' : 'แชร์ผลแข่ง · Stories / Reels', cx, 1815)
}

function drawMatchupLine(
  ctx: CanvasRenderingContext2D,
  home: string,
  away: string,
  cx: number,
  y: number,
  maxWidth: number,
) {
  let size = 36
  const vsGap = 18
  const build = (fontSize: number) => {
    ctx.font = `700 ${fontSize}px "IBM Plex Sans Thai", sans-serif`
    const homeW = ctx.measureText(home).width
    const awayW = ctx.measureText(away).width
    ctx.font = `800 ${Math.max(18, fontSize - 4)}px "IBM Plex Sans", sans-serif`
    const vsW = ctx.measureText('VS').width
    return { homeW, awayW, vsW, total: homeW + awayW + vsW + vsGap * 2 }
  }

  let metrics = build(size)
  while (size > 20 && metrics.total > maxWidth) {
    size -= 1
    metrics = build(size)
  }

  let x = cx - metrics.total / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `700 ${size}px "IBM Plex Sans Thai", sans-serif`
  ctx.fillText(home, x, y)
  x += metrics.homeW + vsGap

  ctx.fillStyle = 'rgba(255, 198, 92, 0.95)'
  ctx.font = `800 ${Math.max(18, size - 4)}px "IBM Plex Sans", sans-serif`
  ctx.fillText('VS', x, y)
  x += metrics.vsW + vsGap

  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.font = `700 ${size}px "IBM Plex Sans Thai", sans-serif`
  ctx.fillText(away, x, y)
  ctx.textAlign = 'center'
}

async function exportVictoryPng(payload: VictoryPayload): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const crest = await loadImage(payload.crestUrl)
  drawVictoryFrame(ctx, payload, crest, 0.55)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

async function exportVictoryVideo(payload: VictoryPayload): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const crest = await loadImage(payload.crestUrl)

  const stream = canvas.captureStream(30)
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : ''
  if (!mime) return null

  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_500_000 })
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    recorder.onerror = () => reject(new Error('record failed'))
  })

  recorder.start(100)
  const durationMs = payload.isFinal ? 3200 : 2500
  const start = performance.now()

  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      drawVictoryFrame(ctx, payload, crest, t)
      if (t < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })

  recorder.stop()
  stream.getTracks().forEach((tr) => tr.stop())
  return done
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function VictoryShareSheet({
  match,
  onClose,
}: {
  match: Match
  onClose: () => void
}) {
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const payload = resolveVictory(match)
  const cardRef = useRef<HTMLDivElement>(null)
  const matchupRef = useRef<HTMLDivElement>(null)
  const shareText = `${payload.homeName} ${payload.homeScore} - ${payload.awayScore} ${payload.awayName} · ${payload.groupLabel} · ${LEAGUE.nameTh}`
  const pageUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bacho-league.vercel.app'

  useEffect(() => {
    const wrap = matchupRef.current
    const line = wrap?.querySelector('.victory-matchup') as HTMLElement | null
    if (!wrap || !line) return
    wrap.style.transform = 'scale(1)'
    const card = wrap.closest('.victory-card') as HTMLElement | null
    const max = (card?.clientWidth ?? wrap.clientWidth) - 28
    const need = line.scrollWidth
    if (need > max && max > 0) {
      wrap.style.transform = `scale(${Math.max(0.7, max / need)})`
    }
  }, [payload.homeName, payload.awayName, payload.isFinal])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareOpen) setShareOpen(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, shareOpen])

  async function handleDownloadPng() {
    setBusy(true)
    setHint(null)
    try {
      const blob = await exportVictoryPng(payload)
      if (!blob) throw new Error('export failed')
      downloadBlob(blob, `bacho-league-${payload.isDraw ? 'draw' : `${payload.winner.id}-win`}.png`)
      setHint('บันทึกรูปแล้ว — โพสต์ Stories ได้เลย')
    } catch {
      setHint('บันทึกรูปไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function handleDownloadVideo() {
    setBusy(true)
    setHint(null)
    try {
      const blob = await exportVictoryVideo(payload)
      if (!blob) throw new Error('video unsupported')
      downloadBlob(blob, `bacho-league-${payload.isDraw ? 'draw' : `${payload.winner.id}-win`}.webm`)
      setHint('บันทึกวิดีโอแล้ว · อัป TikTok / IG Reels ได้')
    } catch {
      setHint('เครื่องนี้ยังบันทึกวิดีโอไม่ได้ — ใช้บันทึกรูปแทน')
    } finally {
      setBusy(false)
    }
  }

  async function shareNative() {
    setBusy(true)
    setHint(null)
    try {
      const blob = await exportVictoryPng(payload)
      if (!blob) throw new Error('export failed')
      const file = new File([blob], `bacho-league-win.png`, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: payload.isDraw ? 'ผลการแข่งขันเสมอ' : `${payload.winner.nameTh} WINNER`,
          text: shareText,
        })
        setHint('แชร์แล้ว')
        setShareOpen(false)
      } else if (navigator.share) {
        await navigator.share({ title: LEAGUE.nameTh, text: shareText, url: pageUrl })
        setHint('แชร์แล้ว')
        setShareOpen(false)
      } else {
        setHint('เครื่องนี้ไม่มีแชร์ระบบ — เลือกช่องทางด้านล่าง')
      }
    } catch {
      setHint('ยกเลิกการแชร์')
    } finally {
      setBusy(false)
    }
  }

  async function shareFacebook() {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}&quote=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720')
    setHint('เปิด Facebook แล้ว · แนบรูปจากปุ่ม “รูป” ได้')
    setShareOpen(false)
  }

  async function shareLine() {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720')
    setHint('เปิด LINE แล้ว')
    setShareOpen(false)
  }

  async function shareX() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=720')
    setHint('เปิด X แล้ว')
    setShareOpen(false)
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${pageUrl}`)
      setHint('คัดลอกข้อความแล้ว')
      setShareOpen(false)
    } catch {
      setHint('คัดลอกไม่สำเร็จ')
    }
  }

  async function shareToStoriesHint(platform: 'IG' | 'TikTok') {
    await handleDownloadPng()
    setHint(
      platform === 'IG'
        ? 'บันทึกรูปแล้ว · เปิด Instagram → Stories → เลือกจากคลังรูป'
        : 'บันทึกรูป/วิดีโอแล้ว · เปิด TikTok → สร้าง → อัปจากคลัง',
    )
    setShareOpen(false)
  }

  return (
    <div className="victory-root" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="victory-scrim" aria-label="ปิด" onClick={onClose} />
      <div className={`victory-shell${payload.isFinal ? ' final' : ''}`}>
        <div className="victory-toolbar">
          <h2 id={titleId}>
            {payload.isFinal
              ? payload.isPreview
                ? 'ตัวอย่างการ์ดนัดชิง'
                : 'การ์ดแชมป์'
              : payload.isPreview
                ? 'ตัวอย่างการ์ดชัย'
                : payload.isDraw
                  ? 'ผลการแข่งขันเสมอ'
                  : 'การ์ดชัยชนะ'}
          </h2>
          <button type="button" className="victory-icon-btn" onClick={onClose} aria-label="ปิด">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="victory-stage">
          <div
            className={`victory-card${payload.isFinal ? ' final' : ''}`}
            ref={cardRef}
            data-winner={payload.isDraw ? 'draw' : payload.winner.id}
          >
            <span className="victory-spark s1" />
            <span className="victory-spark s2" />
            <span className="victory-spark s3" />
            <span className="victory-spark s4" />
            <span className="victory-spark s5" />
            <span className="victory-spark s6" />
            <span className="victory-ray" aria-hidden />
            {payload.isFinal ? <span className="victory-burst" aria-hidden /> : null}

            <p className="victory-kicker">{payload.sportLabel}</p>
            <p className="victory-meta">{payload.groupLabel}</p>
            <p className="victory-date">{payload.kickoffLabel}</p>

            <div className="victory-crest-wrap">
              <span className="victory-ring" aria-hidden />
              {payload.isFinal ? <span className="victory-ring outer" aria-hidden /> : null}
              <img src={payload.crestUrl} alt="" className="victory-crest" />
            </div>

            <p className="victory-winner-mark" aria-label="Winner">
              <span>{payload.resultMark}</span>
            </p>

            <p className="victory-score sports-num">
              {payload.homeScore} - {payload.awayScore}
            </p>

            <div className="victory-matchup-scale" ref={matchupRef}>
              <p className="victory-matchup" title={`${payload.homeName} vs ${payload.awayName}`}>
                <span className="victory-matchup-home">{payload.homeName}</span>
                <span className="victory-matchup-vs">VS</span>
                <span className="victory-matchup-away">{payload.awayName}</span>
              </p>
            </div>

            <p className="victory-league">{LEAGUE.taglineTh}</p>
            {payload.isPreview ? (
              <p className="victory-demo-note">ตัวอย่าง · ยังไม่ใช่ผลจริง</p>
            ) : null}
          </div>
        </div>

        <div className="victory-actions">
          <button
            type="button"
            className="victory-btn primary"
            disabled={busy}
            aria-expanded={shareOpen}
            onClick={() => setShareOpen((v) => !v)}
          >
            <Share2 size={14} strokeWidth={1.8} />
            แชร์
          </button>
          <button type="button" className="victory-btn" disabled={busy} onClick={handleDownloadPng}>
            <Download size={14} strokeWidth={1.8} />
            รูป
          </button>
          <button type="button" className="victory-btn" disabled={busy} onClick={handleDownloadVideo}>
            <Film size={14} strokeWidth={1.8} />
            วิดีโอ
          </button>
        </div>

        {shareOpen ? (
          <div className="victory-share-menu" role="menu" aria-label="เลือกช่องทางแชร์">
            <button type="button" role="menuitem" disabled={busy} onClick={shareNative}>
              <Share2 size={15} strokeWidth={1.8} />
              แอปในเครื่อง
            </button>
            <button type="button" role="menuitem" disabled={busy} onClick={shareFacebook}>
              <span className="victory-share-dot fb" />
              Facebook
            </button>
            <button type="button" role="menuitem" disabled={busy} onClick={shareLine}>
              <MessageCircle size={15} strokeWidth={1.8} />
              LINE
            </button>
            <button type="button" role="menuitem" disabled={busy} onClick={shareX}>
              <span className="victory-share-dot x" />
              X
            </button>
            <button type="button" role="menuitem" disabled={busy} onClick={() => shareToStoriesHint('IG')}>
              <span className="victory-share-dot ig" />
              Instagram Stories
            </button>
            <button type="button" role="menuitem" disabled={busy} onClick={() => shareToStoriesHint('TikTok')}>
              <span className="victory-share-dot tt" />
              TikTok
            </button>
            <button type="button" role="menuitem" disabled={busy} onClick={copyText}>
              <Copy size={15} strokeWidth={1.8} />
              คัดลอกข้อความ
            </button>
          </div>
        ) : null}

        {hint ? (
          <p className="victory-hint">{hint}</p>
        ) : (
          <p className="victory-hint">กดแชร์เพื่อเลือกช่องทาง · บันทึกรูปหรือวิดีโอได้</p>
        )}
      </div>
    </div>
  )
}

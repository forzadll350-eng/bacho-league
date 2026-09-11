import { useApp } from '../context/AppContext'
import { TeamCrest } from './TeamCrest'
import { VolleyballSetScore } from './VolleyballSetScore'
import { LeadAura } from './LeadAura'
import { parseYouTubeId } from '../lib/youtube'
import type { LiveHeroData } from '../types/sports'

function parseScore(score: string): { home: number; away: number } | null {
  const m = score.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!m) return null
  return { home: Number(m[1]), away: Number(m[2]) }
}

export function LiveMatchHero({
  compact = false,
  hero,
  isLive,
}: {
  compact?: boolean
  hero?: LiveHeroData
  isLive?: boolean
}) {
  const { sport, data, openDetail, openStream } = useApp()
  const h = hero ?? data.hero
  const live = isLive ?? true
  const isV = sport === 'volleyball'
  const scores = parseScore(h.score)
  const homeLeading = live && scores != null && scores.home > scores.away
  const awayLeading = live && scores != null && scores.away > scores.home
  const canStream = Boolean(parseYouTubeId(h.liveStreamUrl))

  return (
    <article
      className={`hero${isV ? ' volleyball' : ''}${compact ? ' compact' : ''}`}
      onClick={compact ? undefined : openDetail}
      role={compact ? undefined : 'button'}
      tabIndex={compact ? undefined : 0}
      onKeyDown={
        compact
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openDetail()
              }
            }
      }
    >
      <div className="hero-top">
        <div className={`live-pill${live ? '' : ' wait'}`}>
          {live ? <span className="pulse" /> : null}
          {live ? `สด • ${h.clock}` : h.clock}
        </div>
        <button
          type="button"
          className="hero-link"
          onClick={(e) => {
            e.stopPropagation()
            openDetail()
          }}
        >
          รายละเอียด ›
        </button>
      </div>
      <div className="match-meta">{h.league}</div>
      <div className="teams">
        <div className={`team${homeLeading ? ' is-leading' : ''}`}>
          <div className="crest-wrap">
            {homeLeading ? <LeadAura /> : null}
            <TeamCrest team={h.home} />
          </div>
          <b>{h.home.nameTh}</b>
        </div>
        <div className="score">
          <strong className="sports-num">{h.score}</strong>
          <span>{h.state}</span>
        </div>
        <div className={`team${awayLeading ? ' is-leading' : ''}`}>
          <div className="crest-wrap">
            {awayLeading ? <LeadAura /> : null}
            <TeamCrest team={h.away} />
          </div>
          <b>{h.away.nameTh}</b>
        </div>
      </div>
      {isV && h.sets ? (
        <VolleyballSetScore sets={h.sets} currentSet={4} />
      ) : live ? (
        <div className="hero-stats">
          {h.stats.map(([value, label]) => (
            <div className="hero-stat" key={label}>
              <b className="sports-num">{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="hero-stats">
          <div className="hero-stat" style={{ gridColumn: '1 / -1' }}>
            <b className="sports-num" style={{ fontSize: 13 }}>
              {h.state}
            </b>
            <span>สลับสายด้านบนเพื่อดูสนามอีกฝั่ง</span>
          </div>
        </div>
      )}
      {canStream ? (
        <button
          type="button"
          className="stream-btn"
          onClick={(e) => {
            e.stopPropagation()
            openStream()
          }}
        >
          ดูไลฟ์
        </button>
      ) : null}
    </article>
  )
}

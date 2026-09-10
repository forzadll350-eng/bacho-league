import { useApp } from '../context/AppContext'
import { TeamCrest } from './TeamCrest'
import { VolleyballSetScore } from './VolleyballSetScore'
import { LeadAura } from './LeadAura'

function parseScore(score: string): { home: number; away: number } | null {
  const m = score.match(/(\d+)\s*[–-]\s*(\d+)/)
  if (!m) return null
  return { home: Number(m[1]), away: Number(m[2]) }
}

export function LiveMatchHero({ compact = false }: { compact?: boolean }) {
  const { sport, data, openDetail } = useApp()
  const h = data.hero
  const isV = sport === 'volleyball'
  const scores = parseScore(h.score)
  const homeLeading = scores != null && scores.home > scores.away
  const awayLeading = scores != null && scores.away > scores.home

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
        <div className="live-pill">
          <span className="pulse" />
          สด • {h.clock}
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
      ) : (
        <div className="hero-stats">
          {h.stats.map(([value, label]) => (
            <div className="hero-stat" key={label}>
              <b className="sports-num">{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

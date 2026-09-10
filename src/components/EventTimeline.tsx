import type { FootballMatchEvent, VolleyballEvent } from '../types/sports'
import { useApp } from '../context/AppContext'

function isFootballEvent(
  e: FootballMatchEvent | VolleyballEvent,
): e is FootballMatchEvent {
  return 'minute' in e
}

function eventIcon(e: FootballMatchEvent | VolleyballEvent) {
  if (isFootballEvent(e)) {
    const map: Record<string, string> = {
      goal: 'G',
      yellow_card: 'Y',
      red_card: 'R',
      substitution: 'S',
      penalty: 'P',
      own_goal: 'OG',
      var: 'V',
    }
    return map[e.type] ?? '•'
  }
  const map: Record<string, string> = {
    point: 'P',
    timeout: 'T',
    set_won: 'W',
  }
  return map[e.type] ?? '•'
}

function eventTime(e: FootballMatchEvent | VolleyballEvent) {
  if (isFootballEvent(e)) return `${e.minute}'`
  return `S${e.setNumber}`
}

export function EventTimeline() {
  const { data } = useApp()

  return (
    <div className="card events">
      {data.events.map((e) => (
        <div className="event" key={e.id}>
          <span className="event-time">{eventTime(e)}</span>
          <span className="event-ico">{eventIcon(e)}</span>
          <div>
            <div className="event-title">
              {isFootballEvent(e) ? e.playerName : e.label}
            </div>
            <div className="event-sub">
              {isFootballEvent(e) ? e.label : e.sub}
            </div>
          </div>
          <span className="event-score">
            {isFootballEvent(e)
              ? e.homeScore != null && e.awayScore != null
                ? `${e.homeScore}–${e.awayScore}`
                : ''
              : e.scoreLabel ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

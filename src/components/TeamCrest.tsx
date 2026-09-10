import { useState } from 'react'
import type { Team } from '../types/sports'

export function TeamCrest({
  team,
  className = 'crest',
  imgClassName,
}: {
  team: Team
  className?: string
  imgClassName?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={className} aria-hidden>
        <span className="crest-fallback">{team.shortName}</span>
      </div>
    )
  }

  return (
    <div className={className}>
      <img
        src={team.crestUrl}
        alt={team.nameTh}
        className={imgClassName}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

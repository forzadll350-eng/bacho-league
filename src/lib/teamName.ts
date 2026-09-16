const TEAM_ORG_PREFIXES = ['เทศบาลตำบล', 'อบต.'] as const

export function splitTeamName(nameTh: string) {
  const fullName = nameTh.trim()
  const org = TEAM_ORG_PREFIXES.find((prefix) => fullName.startsWith(prefix))

  if (!org) return { org: null, locality: fullName }

  const locality = fullName.slice(org.length).trim()
  return locality ? { org, locality } : { org: null, locality: fullName }
}

export function isLongTeamLocality(locality: string) {
  return Array.from(locality.replace(/\s+/g, '')).length >= 10
}

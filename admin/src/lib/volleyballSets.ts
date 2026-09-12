export type SetNumber = 1 | 2 | 3

export type SetScorePair = { home: number; away: number }

/** Keys "1" | "2" | "3" → rally points for that set */
export type SetScoresMap = Partial<Record<'1' | '2' | '3', SetScorePair>>

export function clampSetNumber(n: number | null | undefined): SetNumber {
  if (n === 2 || n === 3) return n
  return 1
}

export function readSetPair(scores: SetScoresMap | null | undefined, set: SetNumber): SetScorePair {
  const row = scores?.[String(set) as '1' | '2' | '3']
  return {
    home: Math.max(0, Number(row?.home) || 0),
    away: Math.max(0, Number(row?.away) || 0),
  }
}

export function writeSetPair(
  scores: SetScoresMap | null | undefined,
  set: SetNumber,
  home: number,
  away: number,
): SetScoresMap {
  return {
    ...(scores ?? {}),
    [String(set)]: {
      home: Math.max(0, home),
      away: Math.max(0, away),
    },
  }
}

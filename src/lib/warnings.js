export const INFIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS']
export const OUTFIELD_POSITIONS = ['OF']
export const ALL_POSITIONS = [...INFIELD_POSITIONS, ...OUTFIELD_POSITIONS]

/**
 * Returns true if the player has played at least one inning but zero infield innings
 * so far in the game (amber warning).
 */
export function playerNeedsInfieldWarning(playerId, assignments, currentMaxInning) {
  const played = assignments.filter(
    a => a.player_id === playerId && a.inning <= currentMaxInning
  )
  if (played.length === 0) return false
  return !played.some(a => INFIELD_POSITIONS.includes(a.position))
}

/**
 * Returns a Set of inning numbers where the player has been benched
 * as part of a streak of 2 or more consecutive bench innings (red warning).
 */
export function getConsecutiveBenchInnings(playerId, assignments, totalInnings) {
  // Determine which innings the player actually played
  const playedInnings = new Set(
    assignments.filter(a => a.player_id === playerId).map(a => a.inning)
  )

  // Find consecutive bench streaks of length >= 2
  const warnInnings = new Set()
  let streak = []

  for (let i = 1; i <= totalInnings; i++) {
    if (!playedInnings.has(i)) {
      streak.push(i)
    } else {
      if (streak.length >= 2) {
        streak.forEach(n => warnInnings.add(n))
      }
      streak = []
    }
  }
  if (streak.length >= 2) {
    streak.forEach(n => warnInnings.add(n))
  }

  return warnInnings
}

/**
 * Compute a map of { playerId -> Set<inning> } for bench warnings,
 * and a Set<playerId> for infield warnings.
 */
export function computeWarnings(activePlayers, assignments, totalInnings) {
  const maxPlayedInning = assignments.length
    ? Math.max(...assignments.map(a => a.inning))
    : 0

  const infieldWarnings = new Set()
  const benchWarnings = new Map() // playerId -> Set<inning>

  for (const player of activePlayers) {
    if (playerNeedsInfieldWarning(player.id, assignments, maxPlayedInning)) {
      infieldWarnings.add(player.id)
    }
    const benchSet = getConsecutiveBenchInnings(player.id, assignments, totalInnings)
    if (benchSet.size > 0) {
      benchWarnings.set(player.id, benchSet)
    }
  }

  return { infieldWarnings, benchWarnings }
}

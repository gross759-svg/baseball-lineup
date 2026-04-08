export const INFIELD_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS']
export const OUTFIELD_POSITIONS = ['OF']
export const ALL_POSITIONS = [...INFIELD_POSITIONS, ...OUTFIELD_POSITIONS]

/**
 * Returns true if the player has played at least one inning but zero infield innings.
 */
export function playerNeedsInfieldWarning(playerId, assignments, currentMaxInning) {
  const played = assignments.filter(
    a => a.player_id === playerId && a.inning <= currentMaxInning
  )
  if (played.length === 0) return false
  return !played.some(a => INFIELD_POSITIONS.includes(a.position))
}

/**
 * Returns the set of innings where this player was on the bench, if their total
 * bench count meets or exceeds `threshold`. Returns empty set otherwise.
 */
function getBenchWarnInnings(playerId, assignments, maxInning, threshold) {
  const playedInnings = new Set(
    assignments.filter(a => a.player_id === playerId).map(a => a.inning)
  )
  const benchInnings = []
  for (let i = 1; i <= maxInning; i++) {
    if (!playedInnings.has(i)) benchInnings.push(i)
  }
  return benchInnings.length >= threshold ? new Set(benchInnings) : new Set()
}

/**
 * Compute bench and infield warnings.
 *
 * Bench warning threshold:
 *  - Default: warn if a player has sat 2+ innings total.
 *  - Once every active player has sat at least once, the threshold rises to 3
 *    (sitting twice is acceptable when it's distributed evenly).
 */
export function computeWarnings(activePlayers, assignments, totalInnings) {
  const maxPlayedInning = assignments.length
    ? Math.max(...assignments.map(a => a.inning))
    : 0

  const infieldWarnings = new Set()
  const benchWarnings = new Map()

  // Determine threshold: once everyone has sat once, raise it to 3
  const sittingCounts = activePlayers.map(p => {
    const played = new Set(assignments.filter(a => a.player_id === p.id).map(a => a.inning))
    let count = 0
    for (let i = 1; i <= maxPlayedInning; i++) {
      if (!played.has(i)) count++
    }
    return count
  })

  const everyoneHasSat = sittingCounts.length > 0 && sittingCounts.every(c => c >= 1)
  const threshold = everyoneHasSat ? 3 : 2

  for (const player of activePlayers) {
    if (playerNeedsInfieldWarning(player.id, assignments, maxPlayedInning)) {
      infieldWarnings.add(player.id)
    }
    const benchSet = getBenchWarnInnings(player.id, assignments, maxPlayedInning, threshold)
    if (benchSet.size > 0) {
      benchWarnings.set(player.id, benchSet)
    }
  }

  return { infieldWarnings, benchWarnings }
}

import { INFIELD_POSITIONS } from './warnings.js'

const MAX_OF_PER_INNING = 3

/**
 * Suggest assignments for a given inning.
 * Fills most-constrained positions first to guarantee all slots can be covered.
 *
 * @param {number} inning
 * @param {Array}  activePlayers
 * @param {Array}  allAssignments
 * @param {Array}  lockedAssignments - already-set assignments for this inning (P, C)
 * @returns {Array} { player_id, inning, position, locked? }
 */
export function suggestInning(inning, activePlayers, allAssignments, lockedAssignments = []) {
  const suggestions = lockedAssignments.map(a => ({ ...a, locked: true }))
  const assignedPlayerIds = new Set(suggestions.map(s => s.player_id))

  // Count positions already filled
  const positionCounts = {}
  for (const s of suggestions) {
    positionCounts[s.position] = (positionCounts[s.position] || 0) + 1
  }

  // Build list of positions still needed
  const slotCounts = { P: 1, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: MAX_OF_PER_INNING }
  const neededSlots = []
  for (const [pos, count] of Object.entries(slotCounts)) {
    const filled = positionCounts[pos] || 0
    for (let i = filled; i < count; i++) neededSlots.push(pos)
  }

  // Prior infield players
  const priorInfieldPlayerIds = new Set(
    allAssignments
      .filter(a => a.inning < inning && INFIELD_POSITIONS.includes(a.position))
      .map(a => a.player_id)
  )

  // Players who sat the immediately previous inning
  const satLastInning = new Set(
    activePlayers
      .filter(p => {
        if (inning <= 1) return false
        return !allAssignments.some(a => a.player_id === p.id && a.inning === inning - 1)
      })
      .map(p => p.id)
  )

  let available = activePlayers.filter(p => !assignedPlayerIds.has(p.id))

  function canPlay(player, position) {
    return player.preferred_position === position ||
      (player.secondary_positions || []).includes(position)
  }

  function score(player, position) {
    if (!canPlay(player, position)) return -1
    let s = player.preferred_position === position ? 10 : 5
    if (INFIELD_POSITIONS.includes(position) && !priorInfieldPlayerIds.has(player.id)) s += 4
    if (satLastInning.has(player.id)) s += 2
    return s
  }

  // Sort needed slots by how many available players can fill them (most constrained first)
  const sortedSlots = [...neededSlots].sort((a, b) => {
    const countA = available.filter(p => canPlay(p, a)).length
    const countB = available.filter(p => canPlay(p, b)).length
    return countA - countB
  })

  // Greedy assignment: most constrained slot first
  for (const position of sortedSlots) {
    let bestPlayer = null
    let bestScore = -1

    for (const player of available) {
      const s = score(player, position)
      if (s > bestScore) { bestScore = s; bestPlayer = player }
    }

    if (bestPlayer !== null && bestScore >= 0) {
      suggestions.push({ player_id: bestPlayer.id, inning, position })
      available = available.filter(p => p.id !== bestPlayer.id)
      assignedPlayerIds.add(bestPlayer.id)
    }
  }

  return suggestions
}

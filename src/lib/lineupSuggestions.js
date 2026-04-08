import { INFIELD_POSITIONS } from './warnings.js'

const FIELD_SLOTS = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF', 'OF']
const MAX_OF_PER_INNING = 3

/**
 * Suggest assignments for a given inning.
 *
 * @param {number} inning - The inning to fill (1-based)
 * @param {Array} activePlayers - Players active for this game (ordered by batting order)
 * @param {Array} allAssignments - All existing assignments (all innings)
 * @param {Array} lockedAssignments - Assignments already set for this inning (P and C if coach set them)
 * @returns {Array} Array of { player_id, inning, position } suggestions (includes locked ones)
 */
export function suggestInning(inning, activePlayers, allAssignments, lockedAssignments = []) {
  const suggestions = lockedAssignments.map(a => ({ ...a, locked: true }))
  const assignedPlayerIds = new Set(suggestions.map(s => s.player_id))

  // Count already-assigned positions
  const positionCounts = {}
  for (const s of suggestions) {
    positionCounts[s.position] = (positionCounts[s.position] || 0) + 1
  }

  // Build list of positions still needed
  const neededSlots = []
  const slotCounts = { P: 1, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: MAX_OF_PER_INNING }
  for (const [pos, count] of Object.entries(slotCounts)) {
    const filled = positionCounts[pos] || 0
    for (let i = filled; i < count; i++) {
      neededSlots.push(pos)
    }
  }

  // Prior infield players (have already played infield earlier in the game)
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

  // Available players (not yet assigned for this inning)
  let available = activePlayers.filter(p => !assignedPlayerIds.has(p.id))

  // Score a player for a given position (higher = better fit; -1 = cannot play)
  function score(player, position) {
    const canPreferred = player.preferred_position === position
    const canSecondary = (player.secondary_positions || []).includes(position)
    if (!canPreferred && !canSecondary) return -1

    let s = canPreferred ? 10 : 5

    // Prioritize players who haven't had infield time yet
    if (INFIELD_POSITIONS.includes(position) && !priorInfieldPlayerIds.has(player.id)) {
      s += 4
    }

    // Prioritize players who sat last inning
    if (satLastInning.has(player.id)) {
      s += 2
    }

    return s
  }

  // Greedy assignment: for each needed slot, pick the best available player
  for (const position of neededSlots) {
    let bestPlayer = null
    let bestScore = -1

    for (const player of available) {
      const s = score(player, position)
      if (s > bestScore) {
        bestScore = s
        bestPlayer = player
      }
    }

    if (bestPlayer !== null && bestScore >= 0) {
      suggestions.push({ player_id: bestPlayer.id, inning, position })
      available = available.filter(p => p.id !== bestPlayer.id)
      assignedPlayerIds.add(bestPlayer.id)
    }
  }

  // Any remaining available players are on bench — no assignment added for them

  return suggestions
}

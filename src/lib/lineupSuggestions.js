import { INFIELD_POSITIONS } from './warnings.js'

const MAX_OF_PER_INNING = 3

/**
 * Suggest assignments for a given inning.
 *
 * Priority rules (applied in order, highest weight wins):
 *  1. Has the player already sat out an inning this game?
 *     - Sat the immediately previous inning: highest urgency (+1000)
 *     - Sat any earlier inning: still elevated (+500)
 *  2. Does the player still need infield time (for infield positions)? (+100)
 *  3. Is this the player's preferred position? (+20)
 *  4. Can the player fill this position as a secondary? (base 0 — still eligible)
 *
 * Positions are filled most-constrained-first so no slot is left unfillable.
 */
export function suggestInning(inning, activePlayers, allAssignments, lockedAssignments = []) {
  const suggestions = lockedAssignments.map(a => ({ ...a, locked: true }))
  const assignedPlayerIds = new Set(suggestions.map(s => s.player_id))

  const positionCounts = {}
  for (const s of suggestions) {
    positionCounts[s.position] = (positionCounts[s.position] || 0) + 1
  }

  const slotCounts = { P: 1, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: MAX_OF_PER_INNING }
  const neededSlots = []
  for (const [pos, count] of Object.entries(slotCounts)) {
    const filled = positionCounts[pos] || 0
    for (let i = filled; i < count; i++) neededSlots.push(pos)
  }

  // ── Rule 1: sitting history ──────────────────────────────────────────────
  // Sat the immediately previous inning (highest urgency — get them back in)
  const satLastInning = new Set(
    activePlayers
      .filter(p => {
        if (inning <= 1) return false
        return !allAssignments.some(a => a.player_id === p.id && a.inning === inning - 1)
      })
      .map(p => p.id)
  )

  // Sat any earlier inning (still elevated priority)
  const satAnyInning = new Set(
    activePlayers
      .filter(p => {
        for (let i = 1; i < inning; i++) {
          if (!allAssignments.some(a => a.player_id === p.id && a.inning === i)) return true
        }
        return false
      })
      .map(p => p.id)
  )

  // ── Rule 2: infield need ─────────────────────────────────────────────────
  const hasHadInfield = new Set(
    allAssignments
      .filter(a => a.inning < inning && INFIELD_POSITIONS.includes(a.position))
      .map(a => a.player_id)
  )

  let available = activePlayers.filter(p => !assignedPlayerIds.has(p.id))

  function canPlay(player, position) {
    return player.preferred_position === position ||
      (player.secondary_positions || []).includes(position)
  }

  function score(player, position) {
    if (!canPlay(player, position)) return -1

    let s = 0

    // Rule 1 — sitting history
    if (satLastInning.has(player.id)) {
      s += 1000        // just sat — highest urgency
    } else if (satAnyInning.has(player.id)) {
      s += 500         // sat earlier this game
    }

    // Rule 2 — needs infield time (only relevant for infield positions)
    if (INFIELD_POSITIONS.includes(position) && !hasHadInfield.has(player.id)) {
      s += 100
    }

    // Rule 3 — preferred position
    if (player.preferred_position === position) s += 20

    // Rule 4 — secondary position: already captured by canPlay check above
    // No additional bonus; rule 3 ensures preferred beats secondary

    return s
  }

  // Fill most-constrained slots first so every position can be covered
  const sortedSlots = [...neededSlots].sort((a, b) => {
    const countA = available.filter(p => canPlay(p, a)).length
    const countB = available.filter(p => canPlay(p, b)).length
    return countA - countB
  })

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

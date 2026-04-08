import { useState } from 'react'
import LineupCell, { PositionSheet } from './LineupCell.jsx'
import SuggestionPreview from './SuggestionPreview.jsx'
import { computeWarnings } from '../../lib/warnings.js'
import { useUpsertAssignment, useAcceptSuggestion } from '../../hooks/useLineup.js'
import { pitchTotals } from '../../hooks/usePitching.js'

export default function LineupGrid({
  game,
  activePlayers,  // ordered by batting_order
  assignments = [],
  pitchLog = [],
}) {
  const [suggestInning, setSuggestInning] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null) // { playerId, inning }
  const upsert = useUpsertAssignment(game.id)
  const acceptSuggestion = useAcceptSuggestion(game.id)

  const innings = game.innings
  const inningNums = Array.from({ length: innings }, (_, i) => i + 1)

  // Lookup helpers
  function getAssignment(playerId, inning) {
    return assignments.find(a => a.player_id === playerId && a.inning === inning)
  }

  // Positions already taken in an inning (excluding a specific player)
  function takenInInning(inning, excludePlayerId) {
    return assignments
      .filter(a => a.inning === inning && a.player_id !== excludePlayerId)
      .map(a => a.position)
  }

  // Warnings
  const { infieldWarnings, benchWarnings } = computeWarnings(activePlayers, assignments, innings)

  // Pitch totals
  const totals = pitchTotals(pitchLog)

  function handleAssign(playerId, inning, position) {
    upsert.mutate({ playerId, inning, position })
  }

  function handleCellOpen(playerId, inning) {
    setSelectedCell({ playerId, inning })
  }

  function handleSheetSelect(position) {
    if (!selectedCell) return
    handleAssign(selectedCell.playerId, selectedCell.inning, position)
    setSelectedCell(null)
  }

  function handleAcceptSuggestion(suggestions) {
    acceptSuggestion.mutate(
      {
        inning: suggestInning,
        suggestions: suggestions.filter(s => s.position),
      },
      { onSuccess: () => setSuggestInning(null) }
    )
  }

  const currentInningAssignments = suggestInning
    ? assignments.filter(a => a.inning === suggestInning)
    : []

  return (
    <div>
      {/* Scrollable grid */}
      <div className="lineup-scroll">
        <table className="lineup-table">
          <thead>
            <tr>
              <th className="col-name">Player</th>
              {inningNums.map(n => (
                <th key={n} className="col-inning">{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activePlayers.map((player, idx) => {
              const warnIf = infieldWarnings.has(player.id)
              const benchWarnInnings = benchWarnings.get(player.id) ?? new Set()
              const pitchCount = totals[player.id] ?? 0

              return (
                <tr key={player.id}>
                  {/* Sticky player name */}
                  <td className="col-name">
                    <div className={`lineup-name-cell ${warnIf ? 'lineup-name-cell--warn-if' : ''}`}>
                      <span className="bat-num">{idx + 1}</span>
                      <span className="player-name-text">{player.name}</span>
                      {pitchCount > 0 && (
                        <span className="pitch-tally">{pitchCount}p</span>
                      )}
                    </div>
                  </td>

                  {/* Inning cells */}
                  {inningNums.map(inning => (
                    <LineupCell
                      key={inning}
                      player={player}
                      inning={inning}
                      assignment={getAssignment(player.id, inning)}
                      onOpen={handleCellOpen}
                      benchWarn={benchWarnInnings.has(inning)}
                    />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Warning legend */}
      {(infieldWarnings.size > 0 || benchWarnings.size > 0) && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--slate)', flexWrap: 'wrap' }}>
          {infieldWarnings.size > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, background: 'var(--amber-100)', border: '1px solid var(--amber-600)', borderRadius: 2, display: 'inline-block' }} />
              No infield yet
            </span>
          )}
          {benchWarnings.size > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 12, height: 12, background: 'var(--red-100)', border: '1px solid var(--red-600)', borderRadius: 2, display: 'inline-block' }} />
              2+ consecutive bench
            </span>
          )}
        </div>
      )}

      {/* Suggest bar */}
      {suggestInning === null && (
        <div className="suggest-bar">
          <div style={{ flex: 1, fontSize: '0.875rem', color: 'var(--slate)' }}>
            Auto-fill an inning
          </div>
          {inningNums.map(n => (
            <button
              key={n}
              className="btn btn--outline btn--sm"
              onClick={() => setSuggestInning(n)}
              type="button"
            >
              Inn {n}
            </button>
          ))}
        </div>
      )}

      {/* Position picker sheet (portal) */}
      {selectedCell && (() => {
        const player = activePlayers.find(p => p.id === selectedCell.playerId)
        const asgn = getAssignment(selectedCell.playerId, selectedCell.inning)
        if (!player) return null
        return (
          <PositionSheet
            player={player}
            inning={selectedCell.inning}
            currentPos={asgn?.position ?? null}
            takenPositions={takenInInning(selectedCell.inning, selectedCell.playerId)}
            onSelect={handleSheetSelect}
            onClose={() => setSelectedCell(null)}
          />
        )
      })()}

      {/* Suggestion preview */}
      {suggestInning !== null && (
        <SuggestionPreview
          inning={suggestInning}
          activePlayers={activePlayers}
          allAssignments={assignments}
          currentInningAssignments={currentInningAssignments}
          onAccept={handleAcceptSuggestion}
          onClose={() => setSuggestInning(null)}
          accepting={acceptSuggestion.isPending}
        />
      )}
    </div>
  )
}

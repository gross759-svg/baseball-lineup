import { useState } from 'react'
import LineupCell, { PositionSheet } from './LineupCell.jsx'
import SuggestionPreview from './SuggestionPreview.jsx'
import { computeWarnings } from '../../lib/warnings.js'
import { useUpsertAssignment, useAcceptSuggestion } from '../../hooks/useLineup.js'
import { pitchTotals } from '../../hooks/usePitching.js'

const POSITION_SLOTS = { P: 1, C: 1, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 3 }

export default function LineupGrid({
  game,
  activePlayers,
  assignments = [],
  pitchLog = [],
  onEditOrder,
  onAddInning,
  onRemoveInning,
}) {
  const [suggestInning, setSuggestInning] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null)
  const [pcAlert, setPcAlert] = useState(null) // inning number needing P+C
  const upsert = useUpsertAssignment(game.id)
  const acceptSuggestion = useAcceptSuggestion(game.id)

  const innings = game.innings
  const inningNums = Array.from({ length: innings }, (_, i) => i + 1)

  function getAssignment(playerId, inning) {
    return assignments.find(a => a.player_id === playerId && a.inning === inning)
  }

  function takenInInning(inning, excludePlayerId) {
    return assignments
      .filter(a => a.inning === inning && a.player_id !== excludePlayerId)
      .map(a => a.position)
  }

  // Missing field positions for an inning (from the standard 9-slot lineup)
  function getMissingForInning(inning) {
    const filled = assignments.filter(a => a.inning === inning)
    const counts = {}
    for (const a of filled) counts[a.position] = (counts[a.position] || 0) + 1
    const missing = []
    for (const [pos, needed] of Object.entries(POSITION_SLOTS)) {
      const shortage = needed - (counts[pos] || 0)
      if (shortage > 0) missing.push(shortage > 1 ? `${shortage}×${pos}` : pos)
    }
    return missing
  }

  const { infieldWarnings, benchWarnings } = computeWarnings(activePlayers, assignments, innings)
  const totals = pitchTotals(pitchLog)

  function handleAssign(playerId, inning, position) {
    upsert.mutate({ playerId, inning, position }, {
      onSuccess: () => {
        // Auto-trigger suggestion after P or C is assigned
        if ((position === 'P' || position === 'C') && suggestInning === null) {
          // Build optimistic inning state
          const inningAssignments = [
            ...assignments.filter(a => a.inning === inning && a.player_id !== playerId),
            { player_id: playerId, inning, position },
          ]
          const hasP = inningAssignments.some(a => a.position === 'P')
          const hasC = inningAssignments.some(a => a.position === 'C')
          // Only auto-suggest when exactly P and C are set (inning just started)
          if (hasP && hasC && inningAssignments.length === 2) {
            setSuggestInning(inning)
          }
        }
      },
    })
  }

  function handleCellOpen(playerId, inning) {
    setPcAlert(null)
    setSelectedCell({ playerId, inning })
  }

  function handleSheetSelect(position) {
    if (!selectedCell) return
    handleAssign(selectedCell.playerId, selectedCell.inning, position)
    setSelectedCell(null)
  }

  function handleSuggestInning(n) {
    const inningAssignments = assignments.filter(a => a.inning === n)
    const hasP = inningAssignments.some(a => a.position === 'P')
    const hasC = inningAssignments.some(a => a.position === 'C')
    if (!hasP || !hasC) {
      setPcAlert(n)
      return
    }
    setPcAlert(null)
    setSuggestInning(n)
  }

  function handleAcceptSuggestion(suggestions) {
    acceptSuggestion.mutate(
      { inning: suggestInning, suggestions: suggestions.filter(s => s.position) },
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
              {inningNums.map(n => {
                const missing = getMissingForInning(n)
                return (
                  <th key={n} className="col-inning" style={{ verticalAlign: 'top', paddingTop: 6, paddingBottom: 4, height: 'auto', whiteSpace: 'normal' }}>
                    <div>{n}</div>
                    {missing.length > 0 ? (
                      <div className="col-inning-missing">{missing.join(' ')}</div>
                    ) : (
                      <div className="col-inning-complete">✓</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {activePlayers.map((player, idx) => {
              const warnIf = infieldWarnings.has(player.id)
              const benchWarnInnings = benchWarnings.get(player.id) ?? new Set()
              const pitchCount = totals[player.id] ?? 0
              return (
                <tr key={player.id}>
                  <td className="col-name">
                    <div className={`lineup-name-cell ${warnIf ? 'lineup-name-cell--warn-if' : ''}`}>
                      <span className="bat-num">{idx + 1}</span>
                      <span className="player-name-text">{player.name}</span>
                      {pitchCount > 0 && <span className="pitch-tally">{pitchCount}p</span>}
                    </div>
                  </td>
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
              2+ innings bench
            </span>
          )}
        </div>
      )}

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
        <button className="btn btn--outline btn--sm" onClick={onEditOrder} type="button">
          Edit order
        </button>
        <button className="btn btn--outline btn--sm" onClick={onAddInning} type="button">
          + Add inning
        </button>
        {innings > 1 && (
          <button className="btn btn--outline btn--sm" onClick={onRemoveInning} type="button">
            − Remove inning
          </button>
        )}
      </div>

      {/* P+C required alert */}
      {pcAlert !== null && (
        <div className="alert alert--warn" style={{ margin: '0 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Assign a Pitcher and Catcher for Inning {pcAlert} first.</span>
          <button type="button" onClick={() => setPcAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
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
              onClick={() => handleSuggestInning(n)}
              type="button"
            >
              Inn {n}
            </button>
          ))}
        </div>
      )}

      {/* Position picker sheet */}
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

import { useState } from 'react'
import { suggestInning } from '../../lib/lineupSuggestions.js'

const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS']

export default function SuggestionPreview({
  inning,
  activePlayers,
  allAssignments,
  currentInningAssignments,
  onAccept,
  onClose,
  accepting,
}) {
  const [preview] = useState(() =>
    suggestInning(inning, activePlayers, allAssignments, currentInningAssignments)
  )

  // Build player name map
  const playerMap = Object.fromEntries(activePlayers.map(p => [p.id, p]))

  const assigned = preview.filter(s => s.position)
  const benched = activePlayers.filter(
    p => !preview.some(s => s.player_id === p.id)
  )

  return (
    <div className="suggest-preview">
      <div className="suggest-preview__title">
        Suggested lineup — Inning {inning}
      </div>

      <div className="suggest-grid">
        {assigned.map((s, i) => {
          const player = playerMap[s.player_id]
          const isIf = INFIELD.includes(s.position)
          return (
            <div key={i} className="suggest-item">
              <span
                className="pos-tag"
                style={{
                  background: isIf ? 'var(--blue-100)' : 'var(--green-100)',
                  color: isIf ? 'var(--blue-700)' : 'var(--green-700)',
                  fontSize: '0.75rem',
                  minWidth: 28,
                }}
              >
                {s.position}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player?.name ?? '—'}
                {s.locked && <span style={{ fontSize: '0.65rem', color: 'var(--slate)', marginLeft: 3 }}>🔒</span>}
              </span>
            </div>
          )
        })}
      </div>

      {benched.length > 0 && (
        <div style={{ fontSize: '0.8125rem', color: 'var(--slate)', marginBottom: 10 }}>
          <strong>Bench:</strong> {benched.map(p => p.name).join(', ')}
        </div>
      )}

      <div className="suggest-actions">
        <button className="btn btn--secondary btn--sm" style={{ flex: 1 }} onClick={onClose} type="button">
          Discard
        </button>
        <button
          className="btn btn--primary btn--sm"
          style={{ flex: 1 }}
          onClick={() => onAccept(preview)}
          disabled={accepting}
          type="button"
        >
          {accepting ? 'Applying…' : 'Accept suggestion'}
        </button>
      </div>
    </div>
  )
}

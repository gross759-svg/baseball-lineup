import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS']
const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF']
const MAX_OF = 3

function cellClass(position, benchWarn) {
  if (!position) return benchWarn ? 'asgn-btn--warn' : ''
  if (INFIELD.includes(position)) return 'asgn-btn--if'
  return 'asgn-btn--of'
}

function posClass(pos) {
  return INFIELD.includes(pos) ? 'pos-btn--if' : 'pos-btn--of'
}

/**
 * Renders just the <td> cell. The parent (LineupGrid) owns the open/close
 * state and renders the sheet via a portal.
 */
export default function LineupCell({
  player,
  inning,
  assignment,
  onOpen,   // () => void  — tell parent to open sheet for this cell
  benchWarn,
}) {
  const currentPos = assignment?.position ?? null

  return (
    <td className="asgn-cell">
      <button
        className={`asgn-btn ${cellClass(currentPos, benchWarn)}`}
        onClick={() => onOpen(player.id, inning)}
        aria-label={`Inning ${inning}: ${currentPos ?? 'empty'}`}
        type="button"
      >
        {currentPos ?? ''}
      </button>
    </td>
  )
}

/**
 * Rendered once by LineupGrid via createPortal when a cell is selected.
 */
export function PositionSheet({
  player,
  inning,
  currentPos,
  takenPositions = [],
  onSelect,
  onClose,
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const canPlay = [player.preferred_position, ...(player.secondary_positions || [])]

  function isDisabled(pos) {
    if (pos === currentPos) return false
    if (pos === 'OF') return takenPositions.filter(p => p === 'OF').length >= MAX_OF
    return takenPositions.includes(pos)
  }

  return createPortal(
    <div className="pos-sheet-overlay" onClick={onClose}>
      <div className="pos-sheet" onClick={e => e.stopPropagation()}>
        <div className="pos-sheet__label">
          <strong>{player.name}</strong> — Inning {inning}
        </div>

        <div className="pos-grid">
          {ALL_POSITIONS.map(pos => {
            const able = canPlay.includes(pos)
            const disabled = isDisabled(pos)
            const isCurrent = pos === currentPos
            return (
              <button
                key={pos}
                type="button"
                className={[
                  'pos-btn',
                  posClass(pos),
                  isCurrent ? 'pos-btn--current' : '',
                  (!able || disabled) ? 'pos-btn--disabled' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => { if (able && !disabled) onSelect(pos) }}
              >
                {pos}
              </button>
            )
          })}
          <button type="button" className="pos-btn pos-btn--clear" onClick={() => onSelect(null)}>
            Clear
          </button>
        </div>

        {canPlay.length === 0 && (
          <p className="text-xs text-muted text-center mt-8">
            No positions assigned to this player.
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}

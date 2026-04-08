import { useState } from 'react'
import { useUpsertPitch, pitchTotals } from '../../hooks/usePitching.js'

/**
 * Live per-inning pitch count entry.
 * Lists only players who pitched in at least one inning (assigned to P).
 */
export default function PitchCountEntry({ game, activePlayers, assignments, pitchLog }) {
  const upsertPitch = useUpsertPitch(game.id)
  const totals = pitchTotals(pitchLog)

  // Players who have pitched in any inning
  const pitcherIds = new Set(
    assignments.filter(a => a.position === 'P').map(a => a.player_id)
  )
  const pitchers = activePlayers.filter(p => pitcherIds.has(p.id))

  // Per-inning pitch counts keyed by `${playerId}-${inning}`
  const perInning = {}
  for (const row of pitchLog) {
    if (row.inning > 0) perInning[`${row.player_id}-${row.inning}`] = row.pitch_count
  }

  const inningNums = Array.from({ length: game.innings }, (_, i) => i + 1)

  if (pitchers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🏟️</div>
        <div className="empty-state__title">No pitchers assigned yet</div>
        <div className="empty-state__text">
          Assign players to the P position in the Lineup tab first.
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        Tap a pitcher's inning to log pitch count.
      </p>

      {pitchers.map(player => (
        <PitcherRow
          key={player.id}
          player={player}
          inningNums={inningNums}
          assignments={assignments}
          perInning={perInning}
          total={totals[player.id] ?? 0}
          onSave={(inning, count) =>
            upsertPitch.mutate({ playerId: player.id, inning, pitchCount: count })
          }
        />
      ))}
    </div>
  )
}

function PitcherRow({ player, inningNums, assignments, perInning, total, onSave }) {
  const [editInning, setEditInning] = useState(null)

  // Innings where this player pitched
  const pitchedInnings = new Set(
    assignments.filter(a => a.player_id === player.id && a.position === 'P').map(a => a.inning)
  )

  return (
    <div className="card mb-12">
      <div className="list-item">
        <div className="jersey-badge">{player.jersey_number ?? '—'}</div>
        <div className="list-item__main">
          <div className="list-item__title">{player.name}</div>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--red-600)' }}>
          {total}p total
        </div>
      </div>

      <div style={{ padding: '8px 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {inningNums.map(inning => {
          if (!pitchedInnings.has(inning)) return null
          const count = perInning[`${player.id}-${inning}`] ?? 0
          const isEditing = editInning === inning

          return (
            <div key={inning}>
              {isEditing ? (
                <InningPitchEditor
                  inning={inning}
                  initial={count}
                  onSave={(v) => { onSave(inning, v); setEditInning(null) }}
                  onCancel={() => setEditInning(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditInning(inning)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 54,
                    padding: '6px 0',
                    border: '1.5px solid var(--gray-200)',
                    borderRadius: 'var(--radius)',
                    background: count > 0 ? 'var(--red-50)' : 'var(--gray-50)',
                    cursor: 'pointer',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: '0.6875rem', color: 'var(--slate)' }}>Inn {inning}</span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: count > 0 ? 'var(--red-600)' : 'var(--gray-300)' }}>
                    {count > 0 ? count : '—'}
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InningPitchEditor({ inning, initial, onSave, onCancel }) {
  const [val, setVal] = useState(initial)

  return (
    <div style={{
      border: '2px solid var(--brand)',
      borderRadius: 'var(--radius)',
      padding: '8px 10px',
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      minWidth: 80,
    }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--slate)' }}>Inn {inning}</span>
      <div className="stepper" style={{ padding: 0, gap: 8 }}>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => setVal(v => Math.max(0, v - 1))}
          style={{ width: 32, height: 32, fontSize: '1rem' }}
        >−</button>
        <span className="stepper__val" style={{ fontSize: '1.25rem', minWidth: 32 }}>{val}</span>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => setVal(v => v + 1)}
          style={{ width: 32, height: 32, fontSize: '1rem' }}
        >+</button>
      </div>
      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        <button className="btn btn--secondary btn--sm" style={{ flex: 1, height: 30 }} onClick={onCancel}>✕</button>
        <button className="btn btn--primary btn--sm" style={{ flex: 1, height: 30 }} onClick={() => onSave(val)}>✓</button>
      </div>
    </div>
  )
}

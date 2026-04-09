import { useState, useRef, useEffect } from 'react'
import { useUpsertPitch, pitchTotals } from '../../hooks/usePitching.js'
import { useUpsertAssignment } from '../../hooks/useLineup.js'

export default function PitchCountEntry({ game, activePlayers, assignments, pitchLog }) {
  const upsertPitch = useUpsertPitch(game.id)
  const upsertAssignment = useUpsertAssignment(game.id)
  const totals = pitchTotals(pitchLog)
  const [showSub, setShowSub] = useState(false)

  const pitcherIds = new Set(
    assignments.filter(a => a.position === 'P').map(a => a.player_id)
  )
  const pitchers = activePlayers.filter(p => pitcherIds.has(p.id))

  const perInning = {}
  for (const row of pitchLog) {
    if (row.inning > 0) perInning[`${row.player_id}-${row.inning}`] = row.pitch_count
  }

  const inningNums = Array.from({ length: game.innings }, (_, i) => i + 1)

  function handleSub(inning, playerId) {
    upsertAssignment.mutate({ playerId, inning, position: 'P' })
  }

  if (pitchers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">🏟️</div>
        <div className="empty-state__title">No pitchers assigned yet</div>
        <div className="empty-state__text">Assign players to the P position in the Lineup tab first.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p className="text-sm text-muted" style={{ margin: 0 }}>Tap an inning box to log pitches.</p>
        <button className="btn btn--outline btn--sm" onClick={() => setShowSub(true)} type="button">
          Mid-inning sub
        </button>
      </div>

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

      {showSub && (
        <SubPitcherPanel
          inningNums={inningNums}
          assignments={assignments}
          activePlayers={activePlayers}
          onSub={handleSub}
          onClose={() => setShowSub(false)}
        />
      )}
    </div>
  )
}

function PitcherRow({ player, inningNums, assignments, perInning, total, onSave }) {
  const [editInning, setEditInning] = useState(null)

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
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function handleChange(e) {
    const n = parseInt(e.target.value, 10)
    setVal(isNaN(n) || n < 0 ? 0 : n)
  }

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
      minWidth: 90,
    }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--slate)' }}>Inn {inning}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          type="button"
          className="stepper__btn"
          onClick={() => setVal(v => Math.max(0, v - 1))}
          style={{ width: 28, height: 28, fontSize: '1rem' }}
        >−</button>
        <input
          ref={inputRef}
          type="number"
          min="0"
          value={val}
          onChange={handleChange}
          style={{
            width: 48,
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            border: 'none',
            outline: 'none',
            color: 'var(--red-600)',
            background: 'transparent',
          }}
        />
        <button
          type="button"
          className="stepper__btn"
          onClick={() => setVal(v => v + 1)}
          style={{ width: 28, height: 28, fontSize: '1rem' }}
        >+</button>
      </div>
      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        <button className="btn btn--secondary btn--sm" style={{ flex: 1, height: 30 }} onClick={onCancel}>✕</button>
        <button className="btn btn--primary btn--sm" style={{ flex: 1, height: 30 }} onClick={() => onSave(val)}>✓</button>
      </div>
    </div>
  )
}

function SubPitcherPanel({ inningNums, assignments, activePlayers, onSub, onClose }) {
  const [inning, setInning] = useState(inningNums[inningNums.length - 1])
  const [playerId, setPlayerId] = useState('')

  const currentPitcherIds = new Set(
    assignments.filter(a => a.position === 'P' && a.inning === inning).map(a => a.player_id)
  )

  const availableSubs = activePlayers.filter(p => {
    if (currentPitcherIds.has(p.id)) return false
    return p.preferred_position === 'P' || (p.secondary_positions || []).includes('P')
  })

  // Reset selection when inning changes
  useEffect(() => { setPlayerId('') }, [inning])

  function handleSubmit() {
    if (!playerId) return
    onSub(inning, playerId)
    onClose()
  }

  return (
    <>
      <div className="slide-panel-overlay" onClick={onClose} />
      <div className="slide-panel">
        <div className="slide-panel__handle" />
        <h2 className="slide-panel__title">Mid-inning sub</h2>

        <div className="form-group">
          <label className="form-label">Inning</label>
          <select
            className="form-input"
            value={inning}
            onChange={e => setInning(Number(e.target.value))}
          >
            {inningNums.map(n => (
              <option key={n} value={n}>Inning {n}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Sub in</label>
          {availableSubs.length === 0 ? (
            <div className="alert alert--warn">No available pitchers for Inning {inning}.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {availableSubs.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlayerId(p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    border: `2px solid ${playerId === p.id ? 'var(--brand)' : 'var(--gray-200)'}`,
                    borderRadius: 'var(--radius)',
                    background: playerId === p.id ? 'var(--blue-50, #eff6ff)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div className="jersey-badge" style={{ flexShrink: 0 }}>{p.jersey_number ?? '—'}</div>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button
            className="btn btn--primary"
            style={{ flex: 1 }}
            onClick={handleSubmit}
            disabled={!playerId}
          >
            Sub in
          </button>
        </div>
      </div>
    </>
  )
}

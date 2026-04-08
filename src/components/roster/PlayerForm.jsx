import { useState } from 'react'

const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'OF']
const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS']

function posClass(pos) {
  return INFIELD.includes(pos) ? 'position-chip--if' : 'position-chip--of'
}

export default function PlayerForm({ initial = {}, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial.name ?? '')
  const [jersey, setJersey] = useState(initial.jersey_number ?? '')
  const [pref, setPref] = useState(initial.preferred_position ?? '')
  const [secondary, setSecondary] = useState(initial.secondary_positions ?? [])
  const [error, setError] = useState(null)

  function toggleSecondary(pos) {
    if (pos === pref) return // can't be both preferred and secondary
    setSecondary(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (!pref) return setError('Preferred position is required.')
    setError(null)
    onSave({
      name: name.trim(),
      jersey_number: jersey.trim() || null,
      preferred_position: pref,
      secondary_positions: secondary.filter(p => p !== pref),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="pf-name">Player name</label>
        <input
          id="pf-name"
          type="text"
          className="form-input"
          placeholder="First Last"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="pf-jersey">Jersey # (optional)</label>
        <input
          id="pf-jersey"
          type="text"
          className="form-input"
          placeholder="e.g. 7"
          value={jersey}
          onChange={e => setJersey(e.target.value)}
          inputMode="numeric"
          style={{ maxWidth: 100 }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Preferred position</label>
        <div className="position-chips">
          {ALL_POSITIONS.map(pos => (
            <button
              key={pos}
              type="button"
              className={`position-chip ${posClass(pos)} ${pref === pos ? 'position-chip--on' : ''}`}
              onClick={() => {
                setPref(pos)
                setSecondary(prev => prev.filter(p => p !== pos))
              }}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Secondary positions</label>
        <div className="position-chips">
          {ALL_POSITIONS.filter(p => p !== pref).map(pos => (
            <button
              key={pos}
              type="button"
              className={`position-chip ${posClass(pos)} ${secondary.includes(pos) ? 'position-chip--on' : ''}`}
              onClick={() => toggleSecondary(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
        <span className="form-hint">Positions the player can also play.</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={saving}>
          {saving ? 'Saving…' : 'Save player'}
        </button>
      </div>
    </form>
  )
}

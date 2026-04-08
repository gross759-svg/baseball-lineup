import { useState } from 'react'

export default function GameForm({ onSave, onCancel, saving }) {
  const today = new Date().toISOString().slice(0, 10)
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState(today)
  const [innings, setInnings] = useState(6)
  const [error, setError] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!opponent.trim()) return setError('Opponent name is required.')
    if (!date) return setError('Date is required.')
    setError(null)
    onSave({ opponent: opponent.trim(), date, innings: Number(innings) })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="gf-opp">Opponent</label>
        <input
          id="gf-opp"
          type="text"
          className="form-input"
          placeholder="e.g. Red Sox"
          value={opponent}
          onChange={e => setOpponent(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="gf-date">Date</label>
        <input
          id="gf-date"
          type="date"
          className="form-input"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="gf-innings">Innings</label>
        <select
          id="gf-innings"
          className="form-select"
          value={innings}
          onChange={e => setInnings(e.target.value)}
          style={{ maxWidth: 120 }}
        >
          {[3, 4, 5, 6, 7, 8, 9].map(n => (
            <option key={n} value={n}>{n} innings</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={saving}>
          {saving ? 'Creating…' : 'Create game'}
        </button>
      </div>
    </form>
  )
}

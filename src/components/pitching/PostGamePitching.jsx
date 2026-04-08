import { useState } from 'react'
import { useBulkPitch, pitchTotals } from '../../hooks/usePitching.js'

export default function PostGamePitching({ gameId, activePlayers, pitchLog }) {
  const bulkPitch = useBulkPitch(gameId)
  const existingTotals = pitchTotals(pitchLog)

  // Local state for each player's count
  const [counts, setCounts] = useState(() => {
    const init = {}
    for (const p of activePlayers) {
      init[p.id] = existingTotals[p.id] ?? 0
    }
    return init
  })

  const [saved, setSaved] = useState(false)

  function handleChange(playerId, raw) {
    const val = parseInt(raw, 10)
    setCounts(prev => ({ ...prev, [playerId]: isNaN(val) ? 0 : Math.max(0, val) }))
  }

  function handleSave() {
    const entries = activePlayers
      .filter(p => counts[p.id] > 0)
      .map(p => ({ playerId: p.id, pitchCount: counts[p.id] }))

    bulkPitch.mutate(entries, {
      onSuccess: () => setSaved(true),
    })
  }

  if (saved) {
    return (
      <div className="alert alert--success">
        ✓ Pitch counts saved for this game.
        <button
          className="btn btn--secondary btn--sm"
          style={{ marginTop: 10, display: 'block' }}
          onClick={() => setSaved(false)}
        >
          Edit again
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted mb-16">
        Enter total pitch counts for the game. These override any per-inning entries.
      </p>

      <div className="card">
        {activePlayers.map(player => (
          <div key={player.id} className="pitch-row">
            <div className="jersey-badge" style={{ width: 28, height: 28, fontSize: '0.6875rem' }}>
              {player.jersey_number ?? '—'}
            </div>
            <div className="pitch-row__name">{player.name}</div>
            <input
              type="number"
              className="pitch-row__input"
              value={counts[player.id] || ''}
              onChange={e => handleChange(player.id, e.target.value)}
              placeholder="0"
              min="0"
              inputMode="numeric"
            />
            <span className="text-muted text-xs" style={{ minWidth: 14 }}>p</span>
          </div>
        ))}
      </div>

      <button
        className="btn btn--primary btn--full mt-16"
        onClick={handleSave}
        disabled={bulkPitch.isPending}
      >
        {bulkPitch.isPending ? 'Saving…' : 'Save pitch counts'}
      </button>

      {bulkPitch.isError && (
        <div className="alert alert--error mt-12">
          Failed to save: {bulkPitch.error?.message}
        </div>
      )}
    </div>
  )
}

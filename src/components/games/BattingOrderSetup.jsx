import { useState } from 'react'

export default function BattingOrderSetup({ players = [], onConfirm, saving }) {
  // Start with all active players included, in name order
  const [order, setOrder] = useState(() => [...players])

  function move(index, dir) {
    const newOrder = [...order]
    const target = index + dir
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setOrder(newOrder)
  }

  function toggle(playerId) {
    const exists = order.find(p => p.id === playerId)
    if (exists) {
      setOrder(prev => prev.filter(p => p.id !== playerId))
    } else {
      const player = players.find(p => p.id === playerId)
      if (player) setOrder(prev => [...prev, player])
    }
  }

  const includedIds = new Set(order.map(p => p.id))
  const excluded = players.filter(p => !includedIds.has(p.id))

  return (
    <div>
      <p className="text-sm text-muted mb-12">
        Set batting order for today. Uncheck players who aren't here.
      </p>

      {order.length === 0 && (
        <div className="alert alert--warn">Add at least one player to the lineup.</div>
      )}

      <ol className="order-list">
        {order.map((player, idx) => (
          <li key={player.id} className="order-item">
            <span className="order-item__num">{idx + 1}</span>
            <span className="jersey-badge" style={{ width: 26, height: 26, fontSize: '0.6875rem' }}>
              {player.jersey_number ?? '—'}
            </span>
            <span className="order-item__name">{player.name}</span>
            <div className="order-item__arrows">
              <button
                type="button"
                className="order-arrow"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
              >▲</button>
              <button
                type="button"
                className="order-arrow"
                onClick={() => move(idx, 1)}
                disabled={idx === order.length - 1}
                aria-label="Move down"
              >▼</button>
            </div>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => toggle(player.id)}
              aria-label="Remove from game"
            >✕</button>
          </li>
        ))}
      </ol>

      {excluded.length > 0 && (
        <div className="mt-16">
          <div className="section-title text-sm text-muted mb-8">Not playing today</div>
          {excluded.map(player => (
            <div key={player.id} className="order-item" style={{ opacity: 0.6 }}>
              <span className="jersey-badge" style={{ width: 26, height: 26, fontSize: '0.6875rem' }}>
                {player.jersey_number ?? '—'}
              </span>
              <span className="order-item__name">{player.name}</span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => toggle(player.id)}
              >
                Add back
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn--primary btn--full mt-16"
        onClick={() => onConfirm(order.map(p => p.id))}
        disabled={saving || order.length === 0}
      >
        {saving ? 'Saving…' : 'Lock in batting order →'}
      </button>
    </div>
  )
}

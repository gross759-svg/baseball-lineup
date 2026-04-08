import { useState } from 'react'
import PlayerForm from './PlayerForm.jsx'
import { useAddPlayer, useUpdatePlayer, useDeletePlayer } from '../../hooks/usePlayers.js'
import { useTeam } from '../../lib/context.jsx'

const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS']

function posTagClass(pos) {
  return INFIELD.includes(pos) ? 'pos-tag--if' : 'pos-tag--of'
}

export default function RosterList({ players = [] }) {
  const { team } = useTeam()
  const addPlayer = useAddPlayer(team?.id)
  const updatePlayer = useUpdatePlayer(team?.id)
  const deletePlayer = useDeletePlayer(team?.id)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  function handleAdd(data) {
    addPlayer.mutate(data, {
      onSuccess: () => setShowAddForm(false),
    })
  }

  function handleUpdate(data) {
    updatePlayer.mutate({ id: editingId, ...data }, {
      onSuccess: () => setEditingId(null),
    })
  }

  function handleDelete(id) {
    if (!confirm('Remove this player from the roster?')) return
    deletePlayer.mutate(id)
  }

  const editing = players.find(p => p.id === editingId)

  return (
    <div>
      {/* Add form */}
      {showAddForm && (
        <>
          <div className="slide-panel-overlay" onClick={() => setShowAddForm(false)} />
          <div className="slide-panel">
            <div className="slide-panel__handle" />
            <h2 className="slide-panel__title">Add player</h2>
            <PlayerForm
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
              saving={addPlayer.isPending}
            />
          </div>
        </>
      )}

      {/* Edit form */}
      {editingId && editing && (
        <>
          <div className="slide-panel-overlay" onClick={() => setEditingId(null)} />
          <div className="slide-panel">
            <div className="slide-panel__handle" />
            <h2 className="slide-panel__title">Edit player</h2>
            <PlayerForm
              initial={editing}
              onSave={handleUpdate}
              onCancel={() => setEditingId(null)}
              saving={updatePlayer.isPending}
            />
          </div>
        </>
      )}

      <div className="section-header">
        <span className="section-title">{players.length} players</span>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => setShowAddForm(true)}
        >
          + Add player
        </button>
      </div>

      {players.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">👤</div>
          <div className="empty-state__title">No players yet</div>
          <div className="empty-state__text">Add your roster to get started.</div>
        </div>
      ) : (
        <div className="card">
          {players.map(player => (
            <div key={player.id} className="list-item">
              <div className="jersey-badge">{player.jersey_number ?? '—'}</div>
              <div className="list-item__main">
                <div className="list-item__title">{player.name}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                  <span className={`pos-tag ${posTagClass(player.preferred_position)}`}>
                    {player.preferred_position}
                  </span>
                  {(player.secondary_positions || []).map(pos => (
                    <span key={pos} className={`pos-tag ${posTagClass(pos)}`} style={{ opacity: 0.7 }}>
                      {pos}
                    </span>
                  ))}
                </div>
              </div>
              <div className="list-item__actions">
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => setEditingId(player.id)}
                >
                  Edit
                </button>
                <button
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(player.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeam } from '../lib/context.jsx'
import { useGames, useAddGame } from '../hooks/useGames.js'
import GameForm from '../components/games/GameForm.jsx'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    month: d.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    full: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
  }
}

export default function GamesPage() {
  const { team } = useTeam()
  const { data: games = [], isLoading } = useGames(team?.id)
  const addGame = useAddGame(team?.id)
  const [showForm, setShowForm] = useState(false)

  function handleAdd(data) {
    addGame.mutate(data, { onSuccess: () => setShowForm(false) })
  }

  return (
    <>
      <header className="page-header">
        <h1>Games</h1>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => setShowForm(true)}
        >
          + New game
        </button>
      </header>

      {showForm && (
        <>
          <div className="slide-panel-overlay" onClick={() => setShowForm(false)} />
          <div className="slide-panel">
            <div className="slide-panel__handle" />
            <h2 className="slide-panel__title">New game</h2>
            <GameForm
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
              saving={addGame.isPending}
            />
          </div>
        </>
      )}

      <div className="page-content">
        {isLoading ? (
          <div className="text-muted text-sm">Loading games…</div>
        ) : games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">⚾</div>
            <div className="empty-state__title">No games yet</div>
            <div className="empty-state__text">
              Create your first game to start managing lineups.
            </div>
            <button
              className="btn btn--primary"
              onClick={() => setShowForm(true)}
            >
              Create first game
            </button>
          </div>
        ) : (
          <div>
            {games.map(game => {
              const { month, day, full } = formatDate(game.date)
              const hasOrder = game.batting_order?.length > 0
              return (
                <Link key={game.id} to={`/games/${game.id}`} className="game-card">
                  <div className="game-card__date-box">
                    <span className="game-card__month">{month}</span>
                    <span className="game-card__day">{day}</span>
                  </div>
                  <div className="game-card__info">
                    <div className="game-card__opp">vs. {game.opponent}</div>
                    <div className="game-card__meta">
                      {full} · {game.innings} innings
                      {!hasOrder && (
                        <span style={{ marginLeft: 8, color: 'var(--amber-600)', fontWeight: 600 }}>
                          · Set lineup →
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="game-card__arrow">›</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

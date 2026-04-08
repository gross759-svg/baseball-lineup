import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTeam } from '../lib/context.jsx'
import { useGame, useUpdateGame } from '../hooks/useGames.js'
import { usePlayers } from '../hooks/usePlayers.js'
import { useLineup } from '../hooks/useLineup.js'
import { usePitching } from '../hooks/usePitching.js'
import BattingOrderSetup from '../components/games/BattingOrderSetup.jsx'
import LineupGrid from '../components/lineup/LineupGrid.jsx'
import PitchCountEntry from '../components/pitching/PitchCountEntry.jsx'
import PostGamePitching from '../components/pitching/PostGamePitching.jsx'

const TABS = ['Lineup', 'Pitching', 'Post-game']

export default function GameDetailPage() {
  const { gameId } = useParams()
  const { team } = useTeam()
  const { data: game, isLoading: gameLoading } = useGame(gameId)
  const { data: allPlayers = [] } = usePlayers(team?.id)
  const { data: assignments = [] } = useLineup(gameId)
  const { data: pitchLog = [] } = usePitching(gameId)
  const updateGame = useUpdateGame(team?.id)

  const [tab, setTab] = useState('Lineup')

  if (gameLoading || !game) {
    return (
      <>
        <header className="page-header">
          <Link to="/games" className="page-header__back">‹ Games</Link>
          <h1>Loading…</h1>
          <span />
        </header>
        <div className="page-content"><div className="text-muted text-sm">Loading…</div></div>
      </>
    )
  }

  const hasOrder = game.batting_order?.length > 0

  // Build ordered active-player list from batting_order
  const activePlayers = (game.batting_order ?? [])
    .map(id => allPlayers.find(p => p.id === id))
    .filter(Boolean)

  function handleConfirmOrder(playerIds) {
    updateGame.mutate({ id: game.id, batting_order: playerIds })
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <>
      <header className="page-header">
        <Link to="/games" className="page-header__back">‹</Link>
        <h1>vs. {game.opponent}</h1>
        <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
          {formatDate(game.date)}
        </span>
      </header>

      {!hasOrder ? (
        /* ─── Batting order setup ─── */
        <div className="page-content">
          <div className="section-header">
            <span className="section-title">Set batting order</span>
          </div>
          <BattingOrderSetup
            players={allPlayers}
            onConfirm={handleConfirmOrder}
            saving={updateGame.isPending}
          />
        </div>
      ) : (
        /* ─── Game in progress ─── */
        <>
          <div className="tabs">
            {TABS.map(t => (
              <button
                key={t}
                className={`tab-btn ${tab === t ? 'tab-btn--active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Lineup' && (
            <div className="page-content--flush">
              {activePlayers.length === 0 ? (
                <div className="page-content">
                  <div className="alert alert--warn">
                    No active players found. Players may have been removed from the roster.
                  </div>
                </div>
              ) : (
                <LineupGrid
                  game={game}
                  activePlayers={activePlayers}
                  assignments={assignments}
                  pitchLog={pitchLog}
                />
              )}
            </div>
          )}

          {tab === 'Pitching' && (
            <div className="page-content">
              <PitchCountEntry
                game={game}
                activePlayers={activePlayers}
                assignments={assignments}
                pitchLog={pitchLog}
              />
            </div>
          )}

          {tab === 'Post-game' && (
            <div className="page-content">
              <PostGamePitching
                gameId={game.id}
                activePlayers={activePlayers}
                pitchLog={pitchLog}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

import { useState, useMemo } from 'react'

const INFIELD = ['P', 'C', '1B', '2B', '3B', 'SS']

/**
 * Compute per-player season stats from all games' assignments and pitch logs.
 *
 * @param {Array} players  - full roster
 * @param {Array} games    - all games
 * @param {Array} allAssignments - all lineup_assignments rows across all games
 * @param {Array} allPitchLogs  - all pitching_log rows across all games
 */
function computeStats(players, games, allAssignments, allPitchLogs) {
  return players.map(player => {
    const pid = player.id
    const played = new Set(allAssignments.filter(a => a.player_id === pid).map(a => a.game_id))
    const gamesPlayed = played.size

    const infieldInnings = allAssignments.filter(
      a => a.player_id === pid && INFIELD.includes(a.position)
    ).length

    const outfieldInnings = allAssignments.filter(
      a => a.player_id === pid && a.position === 'OF'
    ).length

    const pitchingInnings = allAssignments.filter(
      a => a.player_id === pid && a.position === 'P'
    ).length

    const totalFielded = infieldInnings + outfieldInnings
    const infieldPct = totalFielded > 0
      ? Math.round((infieldInnings / totalFielded) * 100)
      : null

    // Pitch count: per game, prefer bulk (inning=0) else sum per-inning
    let totalPitches = 0
    for (const gameId of played) {
      const gameLogs = allPitchLogs.filter(l => l.player_id === pid && l.game_id === gameId)
      const bulk = gameLogs.find(l => l.inning === 0)
      if (bulk) {
        totalPitches += bulk.pitch_count
      } else {
        totalPitches += gameLogs.reduce((s, l) => s + l.pitch_count, 0)
      }
    }

    return {
      id: pid,
      name: player.name,
      jersey: player.jersey_number,
      gamesPlayed,
      infieldInnings,
      outfieldInnings,
      pitchingInnings,
      totalPitches,
      infieldPct,
    }
  })
}

const COLS = [
  { key: 'name',           label: 'Player',    align: 'left' },
  { key: 'gamesPlayed',    label: 'GP',         align: 'center' },
  { key: 'infieldInnings', label: 'IF Inn',     align: 'center' },
  { key: 'outfieldInnings',label: 'OF Inn',     align: 'center' },
  { key: 'pitchingInnings',label: 'IP',         align: 'center' },
  { key: 'totalPitches',   label: 'Pitches',    align: 'center' },
  { key: 'infieldPct',     label: 'IF %',       align: 'center' },
]

export default function StatsTable({ players, games, allAssignments, allPitchLogs }) {
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState(1) // 1 = asc, -1 = desc

  const stats = useMemo(
    () => computeStats(players, games, allAssignments, allPitchLogs),
    [players, games, allAssignments, allPitchLogs]
  )

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const av = a[sortKey] ?? -1
      const bv = b[sortKey] ?? -1
      if (av < bv) return -sortDir
      if (av > bv) return sortDir
      return 0
    })
  }, [stats, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => -d)
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 1 : -1)
    }
  }

  if (players.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon">📊</div>
        <div className="empty-state__title">No stats yet</div>
        <div className="empty-state__text">Add players and complete games to see season stats.</div>
      </div>
    )
  }

  return (
    <div className="stats-scroll">
      <table className="stats-table">
        <thead>
          <tr>
            {COLS.map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{ textAlign: col.align }}
              >
                {col.label}
                <span className={`sort-arrow ${sortKey === col.key ? 'sort-arrow--active' : ''}`}>
                  {sortKey === col.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ' ↕'}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.id}>
              <td>
                <span style={{ fontWeight: 500 }}>{row.name}</span>
                {row.jersey && (
                  <span className="text-muted text-xs" style={{ marginLeft: 6 }}>#{row.jersey}</span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>{row.gamesPlayed}</td>
              <td style={{ textAlign: 'center' }}>
                <span style={{ color: 'var(--blue-700)', fontWeight: row.infieldInnings > 0 ? 600 : 400 }}>
                  {row.infieldInnings}
                </span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{ color: 'var(--green-700)', fontWeight: row.outfieldInnings > 0 ? 600 : 400 }}>
                  {row.outfieldInnings}
                </span>
              </td>
              <td style={{ textAlign: 'center' }}>{row.pitchingInnings}</td>
              <td style={{ textAlign: 'center' }}>
                <span style={{ color: row.totalPitches > 0 ? 'var(--red-600)' : 'inherit', fontWeight: row.totalPitches > 0 ? 600 : 400 }}>
                  {row.totalPitches}
                </span>
              </td>
              <td style={{ textAlign: 'center' }}>
                {row.infieldPct !== null ? (
                  <span style={{
                    fontWeight: 600,
                    color: row.infieldPct >= 50 ? 'var(--blue-700)' : 'var(--amber-700)',
                  }}>
                    {row.infieldPct}%
                  </span>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

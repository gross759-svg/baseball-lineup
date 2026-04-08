import { useTeam } from '../lib/context.jsx'
import { usePlayers } from '../hooks/usePlayers.js'
import { useGames } from '../hooks/useGames.js'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import StatsTable from '../components/stats/StatsTable.jsx'

function useAllAssignments(teamId) {
  return useQuery({
    queryKey: ['all-assignments', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lineup_assignments')
        .select('*, games!inner(team_id)')
        .eq('games.team_id', teamId)
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

function useAllPitchLogs(teamId) {
  return useQuery({
    queryKey: ['all-pitching', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pitching_log')
        .select('*, games!inner(team_id)')
        .eq('games.team_id', teamId)
      if (error) throw error
      return data
    },
    enabled: !!teamId,
  })
}

export default function StatsPage() {
  const { team } = useTeam()
  const { data: players = [], isLoading: pLoad } = usePlayers(team?.id)
  const { data: games = [], isLoading: gLoad } = useGames(team?.id)
  const { data: allAssignments = [], isLoading: aLoad } = useAllAssignments(team?.id)
  const { data: allPitchLogs = [], isLoading: pitchLoad } = useAllPitchLogs(team?.id)

  const loading = pLoad || gLoad || aLoad || pitchLoad

  return (
    <>
      <header className="page-header">
        <h1>Season Stats</h1>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {games.length} game{games.length !== 1 ? 's' : ''}
        </span>
      </header>

      <div className="page-content--flush">
        {loading ? (
          <div className="page-content">
            <div className="text-muted text-sm">Loading stats…</div>
          </div>
        ) : (
          <StatsTable
            players={players}
            games={games}
            allAssignments={allAssignments}
            allPitchLogs={allPitchLogs}
          />
        )}
      </div>
    </>
  )
}

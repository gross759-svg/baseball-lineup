import { useTeam } from '../lib/context.jsx'
import { usePlayers } from '../hooks/usePlayers.js'
import RosterList from '../components/roster/RosterList.jsx'
import { supabase } from '../lib/supabase.js'

export default function RosterPage() {
  const { team } = useTeam()
  const { data: players = [], isLoading } = usePlayers(team?.id)

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <>
      <header className="page-header">
        <h1>{team?.name ?? 'Roster'}</h1>
        <button
          onClick={handleSignOut}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.8125rem', cursor: 'pointer', opacity: 0.7 }}
        >
          Sign out
        </button>
      </header>

      <div className="page-content">
        {team && (
          <div style={{ marginBottom: 14, fontSize: '0.75rem', color: 'var(--slate)' }}>
            Invite code: <strong style={{ color: 'var(--gray-700)', letterSpacing: '0.05em' }}>{team.invite_code}</strong>
            <span style={{ marginLeft: 6 }}>— share with co-coaches</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-muted text-sm">Loading roster…</div>
        ) : (
          <RosterList players={players} />
        )}
      </div>
    </>
  )
}

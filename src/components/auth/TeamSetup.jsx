import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../lib/context.jsx'

export default function TeamSetup({ onTeamJoined }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [teamName, setTeamName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Create team
      const { data: team, error: tErr } = await supabase
        .from('teams')
        .insert({ name: teamName.trim() })
        .select()
        .single()
      if (tErr) throw tErr

      // Add self as coach
      const { error: mErr } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: user.id, role: 'coach' })
      if (mErr) throw mErr

      onTeamJoined(team)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data: team, error: tErr } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()
      if (tErr || !team) throw new Error('Team not found. Check the invite code.')

      const { error: mErr } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: user.id, role: 'coach' })
      if (mErr && mErr.code !== '23505') throw mErr // ignore if already a member

      onTeamJoined(team)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">⚾</div>
        <h1 className="auth-card__title">Set up your team</h1>
        <p className="auth-card__subtitle">
          Create a new team or join an existing one with an invite code.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`btn ${tab === 'create' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setTab('create')}
          >
            Create team
          </button>
          <button
            className={`btn ${tab === 'join' ? 'btn--primary' : 'btn--secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setTab('join')}
          >
            Join team
          </button>
        </div>

        {error && <div className="alert alert--error mb-12">{error}</div>}

        {tab === 'create' ? (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label" htmlFor="teamName">Team name</label>
              <input
                id="teamName"
                type="text"
                className="form-input"
                placeholder="e.g. Tigers 10U"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
              {loading ? 'Creating…' : 'Create team'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="form-label" htmlFor="inviteCode">Invite code</label>
              <input
                id="inviteCode"
                type="text"
                className="form-input"
                placeholder="e.g. AB12CD34"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                required
                autoCapitalize="characters"
              />
              <span className="form-hint">Ask your head coach for the invite code.</span>
            </div>
            <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
              {loading ? 'Joining…' : 'Join team'}
            </button>
          </form>
        )}
        <button
          className="btn btn--secondary btn--full"
          style={{ marginTop: 16, fontSize: '0.8125rem' }}
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

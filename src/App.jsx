import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase.js'
import { AuthContext, TeamContext } from './lib/context.jsx'
import Layout from './components/layout/Layout.jsx'
import TeamSetup from './components/auth/TeamSetup.jsx'
import AuthPage from './pages/AuthPage.jsx'
import RosterPage from './pages/RosterPage.jsx'
import GamesPage from './pages/GamesPage.jsx'
import GameDetailPage from './pages/GameDetailPage.jsx'
import StatsPage from './pages/StatsPage.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [team, setTeam] = useState(null)
  const [teamLoading, setTeamLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ error }) => {
      if (error) {
        supabase.auth.signOut()
        setSession(null)
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session)
        })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    if (!session) {
      setTeam(null)
      setTeamLoading(false)
      return
    }
    loadTeam(session.user.id)
  }, [session])

  async function loadTeam(userId) {
    setTeamLoading(true)
    try {
      const { data } = await supabase
        .from('team_members')
        .select('teams(id, name, invite_code)')
        .eq('user_id', userId)
        .limit(1)
        .single()
      if (data?.teams) setTeam(data.teams)
    } catch {
      // No team yet
    } finally {
      setTeamLoading(false)
    }
  }

  if (session === undefined) {
    return <div className="loading-screen">Loading…</div>
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user }}>
      <TeamContext.Provider value={{ team, setTeam, loading: teamLoading }}>
        <BrowserRouter>
          {!session ? (
            <Routes>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="*" element={<AuthPage />} />
            </Routes>
          ) : teamLoading ? (
            <div className="loading-screen">Loading team…</div>
          ) : !team ? (
            <TeamSetup onTeamJoined={(t) => setTeam(t)} />
          ) : (
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/games" replace />} />
                <Route path="/roster" element={<RosterPage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/games/:gameId" element={<GameDetailPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="*" element={<Navigate to="/games" replace />} />
              </Routes>
            </Layout>
          )}
        </BrowserRouter>
      </TeamContext.Provider>
    </AuthContext.Provider>
  )
}

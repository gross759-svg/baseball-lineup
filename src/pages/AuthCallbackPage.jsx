import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? '/auth' : '/', { replace: true })
      })
    } else {
      navigate('/auth', { replace: true })
    }
  }, [navigate])

  return <div className="loading-screen">Signing in…</div>
}

import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function AuthForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="auth-success">
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📬</div>
        <strong>Check your email</strong>
        <p style={{ marginTop: 6, fontSize: '0.875rem', color: 'var(--slate)' }}>
          We sent a magic link to <strong>{email}</strong>.
          <br />Tap it to sign in.
        </p>
        <button
          className="btn btn--secondary mt-16"
          onClick={() => setSent(false)}
          style={{ fontSize: '0.875rem', height: 36 }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert--error mb-12">{error}</div>}
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          className="form-input"
          placeholder="coach@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          inputMode="email"
        />
      </div>
      <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
        {loading ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  )
}

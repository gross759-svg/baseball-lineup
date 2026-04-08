import AuthForm from '../components/auth/AuthForm.jsx'

export default function AuthPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">⚾</div>
        <h1 className="auth-card__title">Lineup Manager</h1>
        <p className="auth-card__subtitle">
          Sign in with your email — no password needed.
        </p>
        <AuthForm />
      </div>
    </div>
  )
}

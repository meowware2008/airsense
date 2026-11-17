import { useState } from 'react'
import { loginUser, registerUser } from '../api'
import { IconWind, IconLoader, IconShieldCheck } from './Icons'
import './login.css'

function Login({ onAuthenticated }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = isRegister
        ? await registerUser(name, email, password)
        : await loginUser(email, password)

      onAuthenticated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="air-auth-canvas">
      {/* Ambient background glows */}
      <div className="auth-ambient-sphere auth-sphere-1" />
      <div className="auth-ambient-sphere auth-sphere-2" />

      <div className="auth-container">
        <div className="auth-card-editorial">
          {/* Brand header */}
          <div className="auth-brand-badge">
            <div className="auth-brand-icon">
              <IconWind size={20} color="#10b981" />
            </div>
            <span className="auth-brand-name">AirSense</span>
          </div>

          <div className="auth-heading-block">
            <h1 className="auth-hero-title">
              {isRegister ? 'Begin Monitoring' : 'Welcome back'}
            </h1>
            <p className="auth-editorial-desc">
              {isRegister ? (
                <>Continuous <em>telemetry & predictive</em> air intelligence.</>
              ) : (
                <>Sign in to your <em>personal atmospheric</em> command center.</>
              )}
            </p>
          </div>

          {error && <div className="auth-error-pill">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form-editorial">
            {isRegister && (
              <div className="auth-field-group">
                <label className="auth-field-label">FULL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="auth-input-editorial"
                  required
                />
              </div>
            )}

            <div className="auth-field-group">
              <label className="auth-field-label">EMAIL ADDRESS</label>
              <input
                type="email"
                placeholder="name@organization.org"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="auth-input-editorial"
                required
              />
            </div>

            <div className="auth-field-group">
              <label className="auth-field-label">PASSWORD</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                className="auth-input-editorial"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? (
                <>
                  <IconLoader size={16} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>{isRegister ? 'Create Account' : 'Access Dashboard'}</span>
              )}
            </button>
          </form>

          <div className="auth-footer-row">
            <p className="auth-toggle-text">
              {isRegister ? 'Already registered?' : "Need access?"}{' '}
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={() => {
                  setIsRegister(!isRegister)
                  setError('')
                }}
              >
                {isRegister ? 'Sign In' : 'Create an account'}
              </button>
            </p>
          </div>

          <div className="auth-badge-demo">
            <IconShieldCheck size={14} color="#10b981" />
            <span>Demo: <strong>demo@airsense.org</strong> • <strong>demo12345</strong></span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

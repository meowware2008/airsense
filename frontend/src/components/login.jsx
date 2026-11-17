import { useState, useEffect } from 'react'
import { loginUser, registerUser } from '../api'
import { IconWind, IconLoader, IconShieldCheck, IconEye, IconEyeOff, IconX } from './Icons'
import './login.css'

function Login({ onAuthenticated, onClose, isModal = false }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Handle escape key to close modal
  useEffect(() => {
    if (!isModal || !onClose) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModal, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = isRegister
        ? await registerUser(name, email, password)
        : await loginUser(email, password)

      onAuthenticated(data)
      if (onClose) onClose()
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  function handleDemoFill() {
    setEmail('demo@airsense.org')
    setPassword('demo12345')
    setIsRegister(false)
    setError('')
  }

  return (
    <div className={`air-auth-canvas ${isModal ? 'auth-modal-backdrop' : ''}`} onClick={isModal ? onClose : undefined}>
      {/* Ambient background glows */}
      {!isModal && (
        <>
          <div className="auth-ambient-sphere auth-sphere-1" />
          <div className="auth-ambient-sphere auth-sphere-2" />
        </>
      )}

      <div className="auth-container" onClick={e => e.stopPropagation()}>
        <div className="auth-card-editorial">
          {/* Modal Close Button */}
          {isModal && onClose && (
            <button
              type="button"
              className="auth-modal-close-btn"
              onClick={onClose}
              aria-label="Close authentication dialog"
            >
              <IconX size={18} />
            </button>
          )}

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
              <div className="auth-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  className="auth-input-editorial auth-input-password"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                </button>
              </div>
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
              {isRegister ? 'Already registered?' : 'Need access?'}{' '}
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

          <div className="auth-badge-demo" onClick={handleDemoFill} role="button" tabIndex={0} title="Click to autofill demo credentials">
            <IconShieldCheck size={14} color="#10b981" />
            <span>
              1-Click Demo: <strong>demo@airsense.org</strong> (Click to pre-fill)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

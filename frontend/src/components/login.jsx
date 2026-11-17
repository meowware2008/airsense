import { useState } from 'react'
import { loginUser, registerUser } from '../api'
import { IconEye, IconEyeOff, IconX, IconShieldCheck, IconLoader } from './Icons'
import './login.css'

export default function Login({ onAuthenticated }) {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleOpenLogin() {
    setIsRegister(false)
    setError('')
    setShowAuthModal(true)
  }

  function handleOpenRegister() {
    setIsRegister(true)
    setError('')
    setShowAuthModal(true)
  }

  function handleDemoFill() {
    setEmail('demo@airsense.org')
    setPassword('demo12345')
    setIsRegister(false)
    setError('')
  }

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
      setError(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="airsense-viewport">
      {/* 1. Top Header Navigation */}
      <header className="airsense-header">
        <div className="airsense-brand">
          <span className="brand-logo-text">AirSense</span>
          <span className="brand-category-tag">ATMOSPHERIC INTELLIGENCE</span>
        </div>

        <nav className="airsense-header-right" aria-label="Main Navigation">
          <button
            type="button"
            className="btn-nav-signup"
            onClick={handleOpenRegister}
          >
            Sign up
          </button>

          <button
            type="button"
            className="btn-nav-login"
            onClick={handleOpenLogin}
          >
            Sign in
          </button>
        </nav>
      </header>

      {/* 3. Hero Bottom Typography & Callouts */}
      <main className="airsense-hero-content">
        {/* Bottom Left Oversized Typography */}
        <div className="airsense-hero-left">
          <span className="hero-eyebrow-label">AIR QUALITY INTELLIGENCE</span>
          <h1 className="airsense-hero-headline">
            Breathe easier.<br />
            Know your air.
          </h1>
        </div>

        {/* Bottom Right Supporting Copy & Refined CTAs */}
        <div className="airsense-hero-right">
          <p className="airsense-hero-subtext">
            Understand air quality, explore pollution trends and see what tomorrow&apos;s air might bring.
          </p>

          <div className="airsense-cta-row">
            <button
              type="button"
              className="btn-primary-cta"
              onClick={handleOpenLogin}
            >
              Discover AirSense
            </button>

            <button
              type="button"
              className="btn-secondary-cta"
              onClick={handleOpenLogin}
            >
              Sign in
            </button>
          </div>
        </div>
      </main>

      {/* 4. Bottom Footer Strip */}
      <footer className="airsense-bottom-strip">
        <div className="airsense-scroll-indicator">
          <span className="scroll-accent-line" />
          <span>SCROLL TO EXPLORE</span>
        </div>

        <div className="airsense-footer-phrase">
          <span>MONITOR · UNDERSTAND · FORECAST</span>
        </div>
      </footer>

      {/* 5. Minimalist Clean Authentication Modal */}
      {showAuthModal && (
        <div className="auth-modal-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-panel" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="auth-modal-close-btn"
              onClick={() => setShowAuthModal(false)}
              aria-label="Close"
            >
              <IconX size={18} />
            </button>

            <div className="auth-modal-badge">
              <span className="modal-badge-name">AirSense</span>
              <span className="modal-badge-sub">ENVIRONMENTAL INTELLIGENCE</span>
            </div>

            <h2 className="auth-modal-title">
              {isRegister ? 'Begin Monitoring' : 'Welcome Back'}
            </h2>
            <p className="auth-modal-desc">
              {isRegister
                ? 'Create your account to access real-time telemetry, 7-day trends, and machine-learning forecasts.'
                : 'Sign in to access your continuous atmospheric monitoring observatory.'}
            </p>

            {error && <div className="auth-modal-error-pill">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-modal-form">
              {isRegister && (
                <div className="auth-input-group">
                  <label className="auth-input-label">FULL NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Jane Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="auth-text-input"
                    required
                  />
                </div>
              )}

              <div className="auth-input-group">
                <label className="auth-input-label">EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="demo@airsense.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="auth-text-input"
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">PASSWORD</label>
                <div className="auth-password-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={8}
                    className="auth-text-input auth-password-input"
                    required
                  />
                  <button
                    type="button"
                    className="auth-eye-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff size={16} /> : <IconEye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-modal-submit"
              >
                {loading ? (
                  <>
                    <IconLoader size={16} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>

            <div className="auth-modal-bottom-row">
              <p className="auth-switch-prompt">
                {isRegister ? 'Already registered?' : 'Need an account?'}{' '}
                <button
                  type="button"
                  className="btn-switch-mode"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError('')
                  }}
                >
                  {isRegister ? 'Sign in' : 'Create account'}
                </button>
              </p>

              <button
                type="button"
                className="btn-demo-autofill"
                onClick={handleDemoFill}
                title="1-Click Fill Demo Credentials"
              >
                <IconShieldCheck size={14} color="#176B70" />
                <span>
                  1-Click Demo: <strong>demo@airsense.org</strong> • <strong>demo12345</strong>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

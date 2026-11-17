import { useState } from 'react'
import JetonDiscsCanvas from './JetonDiscsCanvas'
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
    <div className="jeton-viewport">
      {/* 1. Central 3D Animated Floating Discs */}
      <JetonDiscsCanvas />

      {/* 2. Top Header Navigation */}
      <header className="jeton-header">
        <div className="jeton-brand">
          <span className="jeton-brand-text">AirSense</span>
        </div>

        <div className="jeton-header-right">
          <div className="jeton-nav-dropdown">
            <span>🇬🇧 EN</span>
            <span className="jeton-caret">∨</span>
          </div>

          <button
            type="button"
            className="jeton-nav-link-btn"
            onClick={handleOpenRegister}
          >
            <span>Sign up</span>
            <span className="jeton-caret">∨</span>
          </button>

          <button
            type="button"
            className="jeton-btn-login"
            onClick={handleOpenLogin}
          >
            <span>Login</span>
            <span className="jeton-caret">∨</span>
          </button>
        </div>
      </header>

      {/* 3. Hero Bottom Typography & Callouts */}
      <div className="jeton-hero-content">
        {/* Bottom Left Big Bold Typography */}
        <div className="jeton-hero-left">
          <h1 className="jeton-hero-headline">
            One app for<br />
            all needs
          </h1>
        </div>

        {/* Bottom Right Subtext & Badges */}
        <div className="jeton-hero-right">
          <p className="jeton-hero-subtext">
            Single account for all your atmospheric intelligence.
          </p>

          <div className="jeton-badges-row">
            <button
              type="button"
              className="jeton-store-badge"
              onClick={handleOpenLogin}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.05-1.85.93-2.93-.9.04-2 .61-2.65 1.37-.57.65-1.07 1.76-.93 2.82 1.01.08 2.02-.51 2.65-1.26z" />
              </svg>
              <div className="badge-text-stack">
                <span className="badge-small">Download on the</span>
                <span className="badge-bold">App Store</span>
              </div>
            </button>

            <button
              type="button"
              className="jeton-store-badge"
              onClick={handleOpenLogin}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="m3.609 1.814 11.233 11.233-11.233 11.233c-.235-.235-.385-.561-.385-.923V2.737c0-.362.15-.688.385-.923zm12.35 12.35L4.85 2.054l12.75 7.362-1.641 4.748zm0 0 1.641 4.748-12.75 7.362 11.109-12.11zm1.116-1.116 3.834 2.214a1.072 1.072 0 0 1 0 1.856l-3.834 2.214-1.284-3.142 1.284-3.142z" />
              </svg>
              <div className="badge-text-stack">
                <span className="badge-small">GET IT ON</span>
                <span className="badge-bold">Google Play</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Jeton Floating Navigation Pill Dock */}
      <nav className="jeton-bottom-dock" aria-label="Navigation">
        <button
          type="button"
          className="jeton-dock-item active"
          onClick={handleOpenLogin}
        >
          <span className="dock-icon">⌂</span>
          <span>Personal</span>
          <span className="dock-caret">∨</span>
        </button>

        <button
          type="button"
          className="jeton-dock-item"
          onClick={handleOpenLogin}
        >
          <span>Business</span>
          <span className="dock-caret">∨</span>
        </button>

        <button
          type="button"
          className="jeton-dock-item"
          onClick={handleOpenLogin}
        >
          <span>Company</span>
          <span className="dock-caret">∨</span>
        </button>
      </nav>

      {/* Bottom Left Scroll Indicator */}
      <div className="jeton-scroll-pill">
        <span className="scroll-dot" />
        <span>Scroll</span>
      </div>

      {/* Bottom Right Chat Button */}
      <button
        type="button"
        className="jeton-chat-bubble"
        onClick={handleOpenLogin}
        aria-label="Open support"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </button>

      {/* 5. Minimalist Clean White Authentication Modal */}
      {showAuthModal && (
        <div className="jeton-auth-backdrop" onClick={() => setShowAuthModal(false)}>
          <div className="jeton-auth-modal" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              className="jeton-modal-close"
              onClick={() => setShowAuthModal(false)}
              aria-label="Close"
            >
              <IconX size={20} />
            </button>

            <div className="jeton-modal-brand">
              <span className="modal-brand-name">AirSense</span>
              <span className="modal-brand-tag">ATMOSPHERIC PLATFORM</span>
            </div>

            <h2 className="jeton-modal-title">
              {isRegister ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="jeton-modal-desc">
              {isRegister
                ? 'Sign up to monitor air quality, historical trends and machine learning forecasts.'
                : 'Sign in to access your real-time environmental intelligence dashboard.'}
            </p>

            {error && <div className="jeton-modal-error">{error}</div>}

            <form onSubmit={handleSubmit} className="jeton-modal-form">
              {isRegister && (
                <div className="jeton-form-group">
                  <label className="jeton-form-label">FULL NAME</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="jeton-form-input"
                    required
                  />
                </div>
              )}

              <div className="jeton-form-group">
                <label className="jeton-form-label">EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="demo@airsense.org"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="jeton-form-input"
                  required
                />
              </div>

              <div className="jeton-form-group">
                <label className="jeton-form-label">PASSWORD</label>
                <div className="jeton-password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={8}
                    className="jeton-form-input jeton-password-input"
                    required
                  />
                  <button
                    type="button"
                    className="jeton-password-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="jeton-btn-submit"
              >
                {loading ? (
                  <>
                    <IconLoader size={16} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>{isRegister ? 'Register' : 'Login'}</span>
                )}
              </button>
            </form>

            <div className="jeton-modal-footer">
              <p className="jeton-switch-text">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  className="jeton-btn-switch"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError('')
                  }}
                >
                  {isRegister ? 'Login' : 'Sign up'}
                </button>
              </p>

              <button
                type="button"
                className="jeton-demo-chip"
                onClick={handleDemoFill}
                title="1-Click Fill Demo Credentials"
              >
                <IconShieldCheck size={15} color="#e0281b" />
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

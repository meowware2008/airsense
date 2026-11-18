import { useState, useEffect } from 'react'
import AnimatedCityDiorama from './AnimatedCityDiorama'
import { loginUser, registerUser, pingHealth } from '../api'
import {
  IconLeafOutline,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconUser,
  IconLoader,
  IconShieldCheck,
} from './Icons'
import './login.css'

export default function Login({ onAuthenticated }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Set page and body background to match exact video backdrop color (#e4eadd)
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor
    document.body.style.backgroundColor = '#e4eadd'
    return () => {
      document.body.style.backgroundColor = originalBg
    }
  }, [])

  // Keep-alive: immediately warm up backend on page view and heartbeat every 5 mins
  useEffect(() => {
    pingHealth()
    const interval = setInterval(() => {
      pingHealth()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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
    <div className="airsense-auth-page">
      {/* Top Header Bar */}
      <header className="auth-header-bar">
        <div className="auth-brand-lockup">
          <IconLeafOutline size={26} color="#1E3A2F" />
          <span className="auth-brand-name">AirSense</span>
        </div>
      </header>
      <div className="auth-header-divider" />

      {/* Main Two-Column Split Experience */}
      <main className="auth-split-layout">
        {/* Left Column: Welcome & Illustration */}
        <div className="auth-left-column">
          <div className="auth-left-header">
            <span className="auth-eyebrow-tag">AIR QUALITY INTELLIGENCE</span>
            <h1 className="auth-welcome-title">
              {isRegister ? (
                <>Join the<br />AirSense network.</>
              ) : (
                <>Welcome back<br />to AirSense.</>
              )}
            </h1>
            <p className="auth-welcome-desc">
              {isRegister
                ? 'Create an account to monitor real-time air quality, explore trends and access predictive forecasts.'
                : 'Sign in to monitor air quality, explore trends and get predictive insights.'}
            </p>
          </div>

          <div className="auth-illustration-container">
            <AnimatedCityDiorama className="auth-eco-city-art" />
          </div>
        </div>

        {/* Center Vertical Divider Line */}
        <div className="auth-vertical-rule" />

        {/* Right Column: Clean Form */}
        <div className="auth-right-column">
          <div className="auth-form-card">
            <h2 className="auth-form-heading">
              {isRegister ? 'Sign up' : 'Sign in'}
            </h2>
            <p className="auth-form-subheading">
              {isRegister ? 'Create your AirSense account.' : 'Access your AirSense account.'}
            </p>

            {error && <div className="auth-form-error-banner">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-credential-form">
              {isRegister && (
                <div className="auth-input-wrapper">
                  <IconUser size={20} color="#7A8E82" className="auth-leading-icon" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="auth-text-field"
                    required
                  />
                </div>
              )}

              <div className="auth-input-wrapper">
                <IconMail size={20} color="#7A8E82" className="auth-leading-icon" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="auth-text-field"
                  required
                />
              </div>

              <div className="auth-input-wrapper">
                <IconLock size={20} color="#7A8E82" className="auth-leading-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  className="auth-text-field auth-password-field"
                  required
                />
                <button
                  type="button"
                  className="auth-trailing-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit-action-btn"
              >
                {loading ? (
                  <>
                    <IconLoader size={16} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>{isRegister ? 'Sign up →' : 'Sign in →'}</span>
                )}
              </button>
            </form>

            <div className="auth-account-switch-row">
              <p className="auth-switch-caption">
                {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError('')
                  }}
                >
                  {isRegister ? 'Sign in' : 'Sign up'}
                </button>
              </p>

              <button
                type="button"
                className="auth-demo-autofill-btn"
                onClick={handleDemoFill}
                title="1-Click Fill Demo Credentials"
              >
                <IconShieldCheck size={14} color="#1E3A2F" />
                <span>
                  1-Click Demo: <strong>demo@airsense.org</strong> • <strong>demo12345</strong>
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

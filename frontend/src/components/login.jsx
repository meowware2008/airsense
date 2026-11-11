
import { useState } from 'react'
import { loginUser, registerUser } from '../api'
import { IconWind } from './Icons'
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
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo"><IconWind size={28} color="#258b70" /> AirSense</h1>
        <p className="auth-subtitle">
          Smart Air Quality Monitoring System
        </p>

        <h2>{isRegister ? 'Create Account' : 'Welcome Back!'}</h2>
        <p>
          {isRegister
            ? 'Register to access your AirSense dashboard.'
            : 'Login to monitor your environment.'}
        </p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password (minimum 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isRegister
                ? 'Create Account'
                : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <span onClick={() => {
            setIsRegister(!isRegister)
            setError('')
          }}>
            {isRegister ? 'Login' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  )
}

export default Login

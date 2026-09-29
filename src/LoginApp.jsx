import { useEffect, useMemo, useState } from 'react'
import './LoginApp.css'

const DEMO_EMAIL = 'admin@blooddonor.com'
const DEMO_PASSWORD = 'Admin@123'
const STORAGE_KEY = 'bloodDonorSessionToken'
const LOGIN_API_URL = 'https://example.com/api/auth/login'

function validateCredentials({ email, password }) {
  const errors = {}
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const phoneValid = /^\+?[0-9\s-]{8,15}$/.test(email.trim())

  if (!email.trim()) {
    errors.email = 'Email or contact number is required.'
  } else if (!emailValid && !phoneValid) {
    errors.email = 'Enter a valid email address or registered contact number.'
  }

  if (!password) {
    errors.password = 'Password is required.'
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.'
  }

  return errors
}

async function authenticateUser(credentials) {
  const requestBody = { email: credentials.email.trim(), password: credentials.password }

  try {
    const response = await fetch(LOGIN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(payload?.message || 'Invalid email or password')
    }

    const payload = await response.json().catch(() => ({}))
    return payload.token || payload.accessToken || 'jwt-demo-token'
  } catch (error) {
    if (
      requestBody.email.toLowerCase() === DEMO_EMAIL.toLowerCase() &&
      requestBody.password === DEMO_PASSWORD
    ) {
      return 'demo-jwt-session-token'
    }
    throw error
  }
}

function LoginApp() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/login')

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash.slice(1) || '/registration')
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem(STORAGE_KEY, sessionToken)
      if (route !== '/dashboard') window.location.hash = '/dashboard'
      return
    }

    localStorage.removeItem(STORAGE_KEY)
    if (route === '/dashboard') window.location.hash = '/login'
  }, [sessionToken, route])

  const currentScreen = useMemo(
    () => (sessionToken && route === '/dashboard' ? 'dashboard' : 'login'),
    [route, sessionToken]
  )

  function handleChange(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: '', form: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validateCredentials(form)
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setErrors((previous) => ({ ...previous, form: '' }))
    try {
      const token = await authenticateUser(form)
      setSessionToken(token)
      window.location.hash = '/dashboard'
    } catch (error) {
      setErrors({ form: error.message || 'Invalid email or password' })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleLogout() {
    setSessionToken('')
    setForm({ email: '', password: '' })
    setErrors({})
    window.location.hash = '/registration'
  }

  if (currentScreen === 'dashboard') {
    return (
      <div className="dashboard-page">
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div><p className="eyebrow">Authenticated</p><h2>Dashboard</h2></div>
            <button type="button" className="logout-button" onClick={handleLogout}>Log out</button>
          </div>
          <div className="stats-grid">
            <div className="stat-box"><span>Available donors</span><strong>124</strong></div>
            <div className="stat-box"><span>Urgent requests</span><strong>08</strong></div>
            <div className="stat-box"><span>Upcoming events</span><strong>03</strong></div>
          </div>
          <div className="session-panel"><p>Secure session active</p><code>{sessionToken}</code></div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <a href="#/registration" className="registration-link">Donor registration</a>
        <div className="brand-block">
          <div className="brand-icon">❤</div>
          <p className="eyebrow">Blood donor support</p>
          <h1>Welcome back</h1>
          <p className="intro-text">Sign in to manage donations, requests, and community alerts.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label htmlFor="login-email">User Email or Contact Number</label>
            <input id="login-email" name="email" type="text" value={form.email} onChange={handleChange}
              placeholder="name@example.com or +94 77 123 4567" aria-invalid={Boolean(errors.email)} />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>
          <div className="field-group">
            <label htmlFor="login-password">Password</label>
            <div className="password-wrap">
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={handleChange} placeholder="Enter your password"
                aria-invalid={Boolean(errors.password)} />
              <button type="button" className="toggle-password"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          <div className="meta-row"><a href="#/registration" className="text-link">Forgot Password?</a></div>
          {errors.form && <div className="form-alert">{errors.form}</div>}
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
          <p className="signup-prompt">Don&apos;t have an account? <a href="#/registration" className="text-link accent">Sign Up</a></p>
        </form>
      </div>
    </div>
  )
}

export default LoginApp
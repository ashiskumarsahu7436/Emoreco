import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from 'lucide-react'
import './Login.css'

function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await axios.post('/api/auth/login', formData)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/dashboard')
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-card">

          {/* Header */}
          <div className="login-card-header">
            <h2 className="login-title">Sign in to EMORECO</h2>
            <p className="login-desc">Enter your credentials to access your dashboard.</p>
          </div>

          {/* Content */}
          <div className="login-card-content">

            {/* Google button */}
            <button type="button" className="google-btn">
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.09 3.56-5.17 3.56-8.87z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.29a7.18 7.18 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or continue with email</span>
              <div className="divider-line" />
            </div>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">

              {/* Email */}
              <div className="field-group">
                <label htmlFor="email" className="field-label">Email address</label>
                <div className="input-wrap">
                  <Mail className="input-icon" size={15} color="#9f9fa9" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="field-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <div className="password-label-row">
                  <label htmlFor="password" className="field-label">Password</label>
                  <a href="#" className="forgot-link">Forgot password?</a>
                </div>
                <div className="input-wrap">
                  <Lock className="input-icon" size={15} color="#9f9fa9" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="field-input field-input-padded"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword
                      ? <EyeOff size={15} color="#9f9fa9" />
                      : <Eye size={15} color="#9f9fa9" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="remember-row">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="remember-checkbox"
                />
                <label htmlFor="remember" className="remember-label">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit */}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight size={15} />}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="login-card-footer">
            <p className="create-text">
              Don't have an account?{' '}
              <Link to="/signup" className="create-link">Create one</Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Login

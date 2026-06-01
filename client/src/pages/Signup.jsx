import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-react'
import './Signup.css'

function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)
    try {
      const response = await axios.post('/api/auth/signup', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      })
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/dashboard')
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <main className="signup-main">
        <div className="signup-card">

          {/* Header */}
          <div className="signup-card-header">
            <h2 className="signup-title">Create your account</h2>
            <p className="signup-desc">
              Start analyzing emotions in under a minute. No credit card required.
            </p>
          </div>

          {/* Google button */}
          <div className="signup-card-content">
            <button type="button" className="google-btn">
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24z"/>
                <path fill="#FBBC05" d="M5.29 14.3a7.2 7.2 0 0 1 0-4.6V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.09z"/>
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or continue with email</span>
              <div className="divider-line" />
            </div>

            {error && <div className="signup-error">{error}</div>}

            <form onSubmit={handleSubmit} className="signup-form">
              {/* Full name */}
              <div className="field-group">
                <label htmlFor="name" className="field-label">Full name</label>
                <div className="input-wrap">
                  <User className="input-icon" size={15} color="#9f9fa9" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="field-input"
                  />
                </div>
              </div>

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
                <label htmlFor="password" className="field-label">Password</label>
                <div className="input-wrap">
                  <Lock className="input-icon" size={15} color="#9f9fa9" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
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

              {/* Terms */}
              <div className="terms-row">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="terms-checkbox"
                />
                <label htmlFor="terms" className="terms-label">
                  I agree to the{' '}
                  <span className="terms-link">Terms of Service</span>
                  {' '}and{' '}
                  <span className="terms-link">Privacy Policy</span>
                  .
                </label>
              </div>

              {/* Submit */}
              <button type="submit" className="signup-btn" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
                {!loading && <ArrowRight size={15} />}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="signup-card-footer">
            <p className="signin-text">
              Already have an account?{' '}
              <Link to="/login" className="signin-link">Sign in</Link>
            </p>
          </div>

        </div>
      </main>
    </div>
  )
}

export default Signup

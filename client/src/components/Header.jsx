import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AudioWaveform } from 'lucide-react'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [location])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    navigate('/')
  }

  return (
    <header className="header">
      <Link to="/" className="logo">
        <span className="logo-icon">
          <AudioWaveform size={20} color="white" strokeWidth={2} />
        </span>
        EMORECO
      </Link>

      <nav className="nav-links">
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </Link>
        <Link to="/spaces" className={location.pathname === '/spaces' ? 'active' : ''}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.414 6.5A1 1 0 0011.121 6.793H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
          </svg>
          Spaces
        </Link>
        <Link to="/history" className={location.pathname === '/history' ? 'active' : ''}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
          </svg>
          History
        </Link>
      </nav>

      <div className="auth-buttons">
        {isLoggedIn ? (
          <button className="btn sign-out-btn" onClick={handleLogout}>
            Sign Out
          </button>
        ) : (
          <>
            <Link to="/login">
              <button className="btn sign-in-btn">Sign In</button>
            </Link>
            <Link to="/signup">
              <button className="btn get-started-btn">Get Started</button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default Header

import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    navigate('/')
  }

  return (
    <header className="header">
      <Link to="/" className="logo">
        <i className="fas fa-brain"></i>
        EMORECO
      </Link>
      
      {isLoggedIn && (
        <nav className="nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/spaces">Spaces</Link>
          <Link to="/history">History</Link>
        </nav>
      )}

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
              <button className="btn free-trial-btn">Try for Free</button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default Header

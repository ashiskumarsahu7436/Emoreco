import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import './Home.css'

function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/dashboard')
    }
  }, [navigate])

  return (
    <div className="home">

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-card">
          <div className="hero-content">
            <div className="hero-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              AI-Powered Emotion Recognition
            </div>

            <h1 className="hero-title">
              Understand the emotion behind<br />
              every<span className="hero-highlight">voice</span>
            </h1>

            <p className="hero-subtitle">
              Record or upload audio and let EMORECO transcribe, analyze, and
              reveal the emotional tone in seconds. Organize insights into spaces
              and track your history.
            </p>

            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate('/signup')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
                Start Analyzing
              </button>
              <button className="btn-ghost" onClick={() => navigate('/login')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                Watch Demo
              </button>
            </div>

            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">98%</span>
                <span className="stat-label">Accuracy</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-value">12+</span>
                <span className="stat-label">Emotions</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-value">40+</span>
                <span className="stat-label">Languages</span>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="wave-container">
              <svg viewBox="0 0 400 300" className="wave-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1"/>
                  </linearGradient>
                  <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0891b2" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.05"/>
                  </linearGradient>
                </defs>
                <path className="wave-path wave-1" d="M 50 150 Q 100 80 150 150 Q 200 220 250 150 Q 300 80 350 150" fill="none" stroke="url(#waveGrad1)" strokeWidth="2.5"/>
                <path className="wave-path wave-2" d="M 30 150 Q 95 60 160 150 Q 225 240 290 150 Q 330 90 380 150" fill="none" stroke="url(#waveGrad1)" strokeWidth="1.5" opacity="0.5"/>
                <path className="wave-path wave-3" d="M 20 150 Q 80 100 140 150 Q 200 200 260 150 Q 320 100 380 150" fill="none" stroke="url(#waveGrad2)" strokeWidth="1" opacity="0.6"/>
                <circle cx="200" cy="150" r="60" fill="rgba(34, 211, 238, 0.04)" stroke="rgba(34, 211, 238, 0.12)" strokeWidth="1"/>
                <circle cx="200" cy="150" r="100" fill="rgba(34, 211, 238, 0.02)" stroke="rgba(34, 211, 238, 0.06)" strokeWidth="1"/>
                <circle cx="200" cy="150" r="140" fill="rgba(34, 211, 238, 0.01)" stroke="rgba(34, 211, 238, 0.04)" strokeWidth="1"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-inner">
          <h2 className="section-title">Everything you need to decode emotion</h2>
          <p className="section-subtitle">
            A complete toolkit to capture audio, analyze sentiment, and organize your findings.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: 'rgba(234, 88, 12, 0.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                </svg>
              </div>
              <h3 className="feature-title">Record &amp; Upload</h3>
              <p className="feature-desc">
                Capture audio live from your microphone or upload existing files in any common format.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <line x1="9" y1="10" x2="9" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/>
                </svg>
              </div>
              <h3 className="feature-title">Emotion Analysis</h3>
              <p className="feature-desc">
                Get instant transcription plus a detailed breakdown of the dominant emotional tones.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M3 7a2 2 0 012-2h3.586a1 1 0 01.707.293L10.414 6.793A1 1 0 0011.121 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                </svg>
              </div>
              <h3 className="feature-title">Spaces &amp; History</h3>
              <p className="feature-desc">
                Organize analyses into spaces and revisit your full history whenever you need it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-inner">
          <div className="cta-card">
            <h2 className="cta-title">Ready to hear what emotions are saying?</h2>
            <p className="cta-subtitle">
              Create your free account and run your first analysis in under a minute.
            </p>
            <button className="btn-primary cta-btn" onClick={() => navigate('/signup')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
              Get Started Free
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home

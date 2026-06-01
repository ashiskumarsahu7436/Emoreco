import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import {
  ArrowRight,
  BrainCircuit,
  Folder,
  Mic,
  PlayCircle,
  Sparkles,
} from 'lucide-react'
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
          <img
            src="https://images.unsplash.com/photo-1621947081720-86970823b77a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMHNvdW5kJTIwd2F2ZSUyMGF1ZGlvJTIwdmlzdWFsaXphdGlvbiUyMGRhcmslMjBibHVlfGVufDF8MHx8fDE3ODAyOTQ5MzN8MA&ixlib=rb-4.1.0&q=80&w=400"
            alt="Abstract sound wave"
            className="hero-bg-img"
          />
          <div className="hero-bg-overlay" />

          <div className="hero-content">
            <div className="hero-badge">
              <Sparkles size={14} color="oklch(0.696 0.17 162.48)" />
              AI-Powered Emotion Recognition
            </div>

            <h1 className="hero-title">
              Understand the emotion behind every
              <span className="hero-highlight">voice</span>
            </h1>

            <p className="hero-subtitle">
              Record or upload audio and let EMORECO transcribe, analyze, and
              reveal the emotional tone in seconds. Organize insights into
              spaces and track your history.
            </p>

            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate('/signup')}>
                <Mic size={16} />
                Start Analyzing
              </button>
              <button className="btn-ghost" onClick={() => navigate('/login')}>
                <PlayCircle size={16} />
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
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">Everything you need to decode emotion</h2>
            <p className="section-subtitle">
              A complete toolkit to capture audio, analyze sentiment, and organize your findings.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <Mic size={20} color="oklch(0.696 0.17 162.48)" />
              </div>
              <h3 className="feature-title">Record &amp; Upload</h3>
              <p className="feature-desc">
                Capture audio live from your microphone or upload existing files in any common format.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap">
                <BrainCircuit size={20} color="oklch(0.769 0.188 70.08)" />
              </div>
              <h3 className="feature-title">Emotion Analysis</h3>
              <p className="feature-desc">
                Get instant transcription plus a detailed breakdown of the dominant emotional tones.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap">
                <Folder size={20} color="oklch(0.627 0.265 303.9)" />
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
              <ArrowRight size={16} />
              Get Started Free
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home

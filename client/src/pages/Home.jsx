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
      <section className="hero">
        <h1>Voice-Based AI Emotion Recognition</h1>
        <p className="subtitle">Upload or Speak live - AI detects emotions instantly</p>
        
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-robot"></i>
            </div>
            <h3 className="feature-title">Advanced AI</h3>
            <p>Powered by deep learning algorithms with multi-language support</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-bolt"></i>
            </div>
            <h3 className="feature-title">Real-time Analysis</h3>
            <p>Instant emotion detection from voice with detailed insights</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3 className="feature-title">Detailed Reports</h3>
            <p>Comprehensive emotion analysis with PDF export</p>
          </div>
        </div>

        <div className="cta-section">
          <button 
            className="cta-button" 
            onClick={() => navigate('/signup')}
          >
            Get Started - It's Free
          </button>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="how-it-works-title">How It Works</h2>
        
        <div className="process-steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Speak or Upload</h3>
            <p>Use microphone or upload audio file</p>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <h3>AI Analyzes</h3>
            <p>Multi-AI pipeline processes voice patterns and emotions</p>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <h3>Get Insights</h3>
            <p>Receive detailed emotion analysis and chat with AI</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Analysis.css'

function Analysis() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchAnalysis()
  }, [id, navigate])

  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showChat])

  const fetchAnalysis = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/analyses/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAnalysis(response.data)
      if (response.data.chat_history) {
        setMessages(response.data.chat_history)
      }
    } catch (err) {
      alert('Failed to load analysis')
      navigate('/history')
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const userMessage = { role: 'user', content: newMessage }
    setMessages(prev => [...prev, userMessage])
    setNewMessage('')
    setSendingMessage(true)

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(
        `/api/analyses/${id}/chat`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }])
    } catch (err) {
      alert('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const downloadPDF = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/analyses/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `emotion-analysis-${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('Failed to download PDF')
    }
  }

  const getEmotionConfig = (emotion) => {
    const map = {
      angry:   { icon: '😠', label: 'Angry',   color: '#FF4444' },
      heavy:   { icon: '😔', label: 'Heavy',   color: '#8B5CF6' },
      sad:     { icon: '😢', label: 'Sad',     color: '#3B82F6' },
      neutral: { icon: '😐', label: 'Neutral', color: '#6B7280' },
    }
    return map[emotion?.toLowerCase()] || { icon: '🎭', label: emotion || 'Unknown', color: '#6B7280' }
  }

  const getPositivityConfig = (val) => {
    const map = {
      positive: { icon: '😊', label: 'Positive', color: '#10B981' },
      neutral:  { icon: '😐', label: 'Neutral',  color: '#6B7280' },
      negative: { icon: '😟', label: 'Negative', color: '#EF4444' },
    }
    return map[val?.toLowerCase()] || { icon: '❓', label: val || 'Unknown', color: '#6B7280' }
  }

  const getArousalConfig = (val) => {
    const map = {
      strong: { icon: '⚡', label: 'High Energy', color: '#F59E0B', level: 3 },
      neutral: { icon: '〰️', label: 'Moderate',   color: '#6B7280', level: 2 },
      weak:   { icon: '🌙', label: 'Low Energy',  color: '#60A5FA', level: 1 },
    }
    return map[val?.toLowerCase()] || { icon: '❓', label: val || 'Unknown', color: '#6B7280', level: 0 }
  }

  const getEngagementConfig = (val) => {
    const map = {
      engaged:   { icon: '🎯', label: 'Engaged',   color: '#10B981' },
      neutral:   { icon: '😶', label: 'Neutral',   color: '#6B7280' },
      withdrawn: { icon: '🚶', label: 'Withdrawn', color: '#F59E0B' },
    }
    return map[val?.toLowerCase()] || { icon: '❓', label: val || 'Unknown', color: '#6B7280' }
  }

  const getRateConfig = (val) => {
    const map = {
      fast:   { icon: '🚀', label: 'Fast',   color: '#EF4444' },
      normal: { icon: '🚶', label: 'Normal', color: '#10B981' },
      slow:   { icon: '🐢', label: 'Slow',   color: '#3B82F6' },
    }
    return map[val?.toLowerCase()] || { icon: '❓', label: val || 'Unknown', color: '#6B7280' }
  }

  const getGenderIcon = (g) => g?.toLowerCase() === 'female' ? '👩' : g?.toLowerCase() === 'male' ? '👨' : '🧑'
  const getLanguageLabel = (code) => {
    const langs = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
      mr: 'Marathi', bn: 'Bengali', gu: 'Gujarati', kn: 'Kannada',
      ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu', fr: 'French',
      de: 'German', es: 'Spanish', zh: 'Chinese', ja: 'Japanese',
    }
    if (!code) return null
    return langs[code.toLowerCase()] || code.toUpperCase()
  }

  if (loading) {
    return (
      <div className="loading-container">
        <i className="fas fa-spinner fa-spin"></i>
        <p>Loading analysis...</p>
      </div>
    )
  }

  if (!analysis) {
    return <div className="error-container">Analysis not found</div>
  }

  const behavioral = analysis.hume_emotions || {}
  const hasBehavioral = behavioral.dominantEmotion || behavioral.dominantPositivity || behavioral.dominantArousal
  const hasDemographics = behavioral.detectedGender || behavioral.estimatedAge || behavioral.detectedLanguage

  const emotionCfg   = getEmotionConfig(behavioral.dominantEmotion)
  const positivityCfg = getPositivityConfig(behavioral.dominantPositivity)
  const arousalCfg   = getArousalConfig(behavioral.dominantArousal)
  const engagementCfg = getEngagementConfig(behavioral.dominantEngagement)
  const rateCfg      = getRateConfig(behavioral.dominantSpeakingRate)

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <button className="back-btn" onClick={() => navigate('/history')}>
          <i className="fas fa-arrow-left"></i> Back to History
        </button>
        <button className="pdf-btn" onClick={downloadPDF}>
          <i className="fas fa-file-pdf"></i> Download PDF
        </button>
      </div>

      <div className="analysis-container">

        <section className="transcription-section">
          <h2><i className="fas fa-file-alt"></i> Transcription</h2>
          <div className="content-box">
            <p>{analysis.transcription}</p>
          </div>
        </section>

        {hasBehavioral && (
          <section className="voice-profile-section">
            <h2><i className="fas fa-wave-square"></i> Voice Profile</h2>
            <p className="section-subtitle">Detected from vocal acoustics by Behavioral Signals AI</p>

            <div className="voice-metrics-grid">
              <div className="metric-card" style={{ '--accent-color': emotionCfg.color }}>
                <div className="metric-icon">{emotionCfg.icon}</div>
                <div className="metric-label">Emotion</div>
                <div className="metric-value" style={{ color: emotionCfg.color }}>
                  {emotionCfg.label}
                </div>
              </div>

              <div className="metric-card" style={{ '--accent-color': positivityCfg.color }}>
                <div className="metric-icon">{positivityCfg.icon}</div>
                <div className="metric-label">Tone</div>
                <div className="metric-value" style={{ color: positivityCfg.color }}>
                  {positivityCfg.label}
                </div>
              </div>

              <div className="metric-card" style={{ '--accent-color': arousalCfg.color }}>
                <div className="metric-icon">{arousalCfg.icon}</div>
                <div className="metric-label">Energy Level</div>
                <div className="metric-value" style={{ color: arousalCfg.color }}>
                  {arousalCfg.label}
                </div>
                <div className="energy-bar">
                  <div
                    className="energy-fill"
                    style={{
                      width: `${(arousalCfg.level / 3) * 100}%`,
                      background: arousalCfg.color
                    }}
                  />
                </div>
              </div>

              <div className="metric-card" style={{ '--accent-color': engagementCfg.color }}>
                <div className="metric-icon">{engagementCfg.icon}</div>
                <div className="metric-label">Engagement</div>
                <div className="metric-value" style={{ color: engagementCfg.color }}>
                  {engagementCfg.label}
                </div>
              </div>

              <div className="metric-card" style={{ '--accent-color': rateCfg.color }}>
                <div className="metric-icon">{rateCfg.icon}</div>
                <div className="metric-label">Speaking Rate</div>
                <div className="metric-value" style={{ color: rateCfg.color }}>
                  {rateCfg.label}
                </div>
              </div>

              <div
                className="metric-card"
                style={{ '--accent-color': behavioral.hesitationDetected ? '#F59E0B' : '#10B981' }}
              >
                <div className="metric-icon">
                  {behavioral.hesitationDetected ? '⏸️' : '▶️'}
                </div>
                <div className="metric-label">Hesitation</div>
                <div
                  className="metric-value"
                  style={{ color: behavioral.hesitationDetected ? '#F59E0B' : '#10B981' }}
                >
                  {behavioral.hesitationDetected ? 'Detected' : 'None'}
                </div>
              </div>
            </div>
          </section>
        )}

        {hasDemographics && (
          <section className="demographics-section">
            <h2><i className="fas fa-user-circle"></i> Speaker Profile</h2>
            <p className="section-subtitle">Estimated from voice characteristics</p>
            <div className="demographics-row">
              {behavioral.detectedGender && (
                <div className="demo-chip">
                  <span className="demo-icon">{getGenderIcon(behavioral.detectedGender)}</span>
                  <span className="demo-text">
                    <span className="demo-key">Gender</span>
                    <span className="demo-val">
                      {behavioral.detectedGender.charAt(0).toUpperCase() + behavioral.detectedGender.slice(1)}
                    </span>
                  </span>
                </div>
              )}
              {behavioral.estimatedAge && (
                <div className="demo-chip">
                  <span className="demo-icon">🎂</span>
                  <span className="demo-text">
                    <span className="demo-key">Est. Age</span>
                    <span className="demo-val">~{behavioral.estimatedAge} yrs</span>
                  </span>
                </div>
              )}
              {behavioral.detectedLanguage && (
                <div className="demo-chip">
                  <span className="demo-icon">🌐</span>
                  <span className="demo-text">
                    <span className="demo-key">Language</span>
                    <span className="demo-val">
                      {getLanguageLabel(behavioral.detectedLanguage)}
                    </span>
                  </span>
                </div>
              )}
              {analysis.language && !behavioral.detectedLanguage && (
                <div className="demo-chip">
                  <span className="demo-icon">🌐</span>
                  <span className="demo-text">
                    <span className="demo-key">Language</span>
                    <span className="demo-val">{getLanguageLabel(analysis.language)}</span>
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="primary-emotion-section">
          <h2><i className="fas fa-smile"></i> Primary Emotion</h2>
          <div className="content-box">
            <p>{analysis.primary_emotion}</p>
          </div>
        </section>

        <section className="detailed-analysis-section">
          {!showDetailedAnalysis ? (
            <button
              className="show-analysis-btn"
              onClick={() => setShowDetailedAnalysis(true)}
            >
              Show Detailed Analysis
            </button>
          ) : (
            <>
              <h2><i className="fas fa-brain"></i> Detailed Analysis</h2>
              <div className="content-box detailed-content">
                <p>{analysis.detailed_analysis}</p>
              </div>
            </>
          )}
        </section>

        <section className="chat-section">
          {!showChat ? (
            <button
              className="show-chat-btn"
              onClick={() => setShowChat(true)}
            >
              <i className="fas fa-comments"></i> Chat with AI about this Analysis
            </button>
          ) : (
            <>
              <h2><i className="fas fa-comments"></i> AI Chat</h2>
              <div className="chat-container">
                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="chat-empty">
                      <p>Ask me anything about this analysis!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className="message-content">{msg.content}</div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={sendChatMessage} className="chat-input-form">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask about the analysis..."
                    disabled={sendingMessage}
                  />
                  <button type="submit" disabled={sendingMessage}>
                    {sendingMessage ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  )
}

export default Analysis

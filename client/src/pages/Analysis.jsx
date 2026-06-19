import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  ArrowLeft,
  FileText,
  Smile,
  Brain,
  MessageSquare,
  Download,
  Send,
  Loader2,
  Mic,
  Zap,
  TrendingUp,
  Activity,
  Clock,
  PauseCircle,
  User,
  Globe,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
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
    if (!token) { navigate('/login'); return }
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
      if (response.data.chat_history) setMessages(response.data.chat_history)
    } catch {
      alert('Failed to load analysis')
      navigate('/history')
    } finally {
      setLoading(false)
    }
  }

  const sendChatMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: newMessage }])
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
    } catch {
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
    } catch {
      alert('Failed to download PDF')
    }
  }

  const EMOTION_MAP = {
    angry:   { emoji: '😠', label: 'Angry',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
    happy:   { emoji: '😊', label: 'Happy',   color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
    heavy:   { emoji: '😔', label: 'Heavy',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
    sad:     { emoji: '😢', label: 'Sad',     color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
    neutral: { emoji: '😐', label: 'Neutral', color: '#9f9fa9', bg: 'rgba(159,159,169,0.1)', border: 'rgba(159,159,169,0.25)' },
  }

  const POSITIVITY_MAP = {
    positive: { label: 'Positive', color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)' },
    neutral:  { label: 'Neutral',  color: '#9f9fa9', bg: 'rgba(159,159,169,0.1)', border: 'rgba(159,159,169,0.25)' },
    negative: { label: 'Negative', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
  }

  const AROUSAL_MAP = {
    strong:  { label: 'High',     color: '#f59e0b', pct: 100 },
    neutral: { label: 'Moderate', color: '#60a5fa', pct: 55 },
    weak:    { label: 'Low',      color: '#6b7280', pct: 20 },
  }

  const ENGAGEMENT_MAP = {
    engaged:   { label: 'Engaged',   color: '#22c55e' },
    neutral:   { label: 'Neutral',   color: '#9f9fa9' },
    withdrawn: { label: 'Withdrawn', color: '#f59e0b' },
  }

  const RATE_MAP = {
    fast:   { label: 'Fast',   color: '#ef4444' },
    normal: { label: 'Normal', color: '#22c55e' },
    slow:   { label: 'Slow',   color: '#60a5fa' },
  }

  const LANG_MAP = {
    en:'English', hi:'Hindi', ta:'Tamil', te:'Telugu', mr:'Marathi',
    bn:'Bengali', gu:'Gujarati', kn:'Kannada', ml:'Malayalam', pa:'Punjabi',
    ur:'Urdu', fr:'French', de:'German', es:'Spanish', zh:'Chinese', ja:'Japanese',
  }

  if (loading) {
    return (
      <div className="an-loading">
        <Loader2 size={32} className="an-spin" />
        <p>Loading analysis…</p>
      </div>
    )
  }

  if (!analysis) return <div className="an-loading"><p>Analysis not found</p></div>

  const beh = analysis.hume_emotions || {}
  const hasBeh = beh.dominantEmotion || beh.dominantPositivity || beh.dominantArousal
  const hasDemo = beh.detectedGender || beh.estimatedAge || beh.detectedLanguage || beh.dominantSpeaker

  const emotion     = EMOTION_MAP[beh.dominantEmotion?.toLowerCase()] || null
  const positivity  = POSITIVITY_MAP[beh.dominantPositivity?.toLowerCase()] || null
  const arousal     = AROUSAL_MAP[beh.dominantArousal?.toLowerCase()] || null
  const engagement  = ENGAGEMENT_MAP[beh.dominantEngagement?.toLowerCase()] || null
  const rate        = RATE_MAP[beh.dominantSpeakingRate?.toLowerCase()] || null
  const langLabel   = LANG_MAP[beh.detectedLanguage?.toLowerCase()] || (beh.detectedLanguage ? beh.detectedLanguage.toUpperCase() : null)
  const fallbackLang = LANG_MAP[analysis.language?.toLowerCase()] || analysis.language?.toUpperCase()

  const fmt = (d) => new Date(d).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="an-page">
      <div className="an-container">

        {/* ── Header ── */}
        <div className="an-header">
          <div className="an-header-left">
            <button className="an-back-btn" onClick={() => navigate('/history')}>
              <ArrowLeft size={15} /> Back to History
            </button>
            <span className="an-date">{fmt(analysis.created_at)}</span>
          </div>
          <button className="an-download-btn" onClick={downloadPDF}>
            <Download size={15} /> Export PDF
          </button>
        </div>

        {/* ── Transcription ── */}
        <section className="an-card">
          <div className="an-card-header">
            <div className="an-card-icon">
              <FileText size={16} color="#9f9fa9" />
            </div>
            <div>
              <h2 className="an-card-title">Transcription</h2>
              <p className="an-card-sub">Speech-to-text via Deepgram{analysis.language ? ` · ${LANG_MAP[analysis.language] || analysis.language.toUpperCase()}` : ''}</p>
            </div>
          </div>
          <div className="an-text-box">
            <p className="an-body-text">{analysis.transcription}</p>
          </div>
        </section>

        {/* ── Voice Profile ── */}
        {hasBeh && (
          <section className="an-card">
            <div className="an-card-header">
              <div className="an-card-icon">
                <Activity size={16} color="#9f9fa9" />
              </div>
              <div>
                <h2 className="an-card-title">Voice Profile</h2>
                <p className="an-card-sub">Behavioral metrics detected from vocal acoustics</p>
              </div>
            </div>

            <div className="an-metrics-grid">
              {emotion && (
                <div className="an-metric" style={{ '--m-color': emotion.color, '--m-bg': emotion.bg, '--m-border': emotion.border }}>
                  <span className="an-metric-emoji">{emotion.emoji}</span>
                  <span className="an-metric-key">Emotion</span>
                  <span className="an-metric-val">{emotion.label}</span>
                </div>
              )}

              {positivity && (
                <div className="an-metric" style={{ '--m-color': positivity.color, '--m-bg': positivity.bg, '--m-border': positivity.border }}>
                  <span className="an-metric-emoji">
                    {positivity.label === 'Positive' ? '😊' : positivity.label === 'Negative' ? '😟' : '😶'}
                  </span>
                  <span className="an-metric-key">Sentiment</span>
                  <span className="an-metric-val">{positivity.label}</span>
                </div>
              )}

              {arousal && (
                <div className="an-metric an-metric-wide" style={{ '--m-color': arousal.color, '--m-bg': 'rgba(255,255,255,0.03)', '--m-border': 'rgba(255,255,255,0.08)' }}>
                  <div className="an-metric-row">
                    <Zap size={14} color={arousal.color} />
                    <span className="an-metric-key">Vocal Strength</span>
                    <span className="an-metric-val" style={{ color: arousal.color, marginLeft: 'auto' }}>{arousal.label}</span>
                  </div>
                  <div className="an-energy-track">
                    <div className="an-energy-fill" style={{ width: `${arousal.pct}%`, background: arousal.color }} />
                  </div>
                </div>
              )}

              {rate && (
                <div className="an-metric" style={{ '--m-color': rate.color, '--m-bg': 'rgba(255,255,255,0.03)', '--m-border': 'rgba(255,255,255,0.08)' }}>
                  <span className="an-metric-emoji">
                    {rate.label === 'Fast' ? '🚀' : rate.label === 'Slow' ? '🐢' : '🚶'}
                  </span>
                  <span className="an-metric-key">Speaking Rate</span>
                  <span className="an-metric-val" style={{ color: rate.color }}>{rate.label}</span>
                </div>
              )}

              <div className="an-metric" style={{
                '--m-color': beh.hesitationDetected ? '#f59e0b' : '#22c55e',
                '--m-bg': beh.hesitationDetected ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
                '--m-border': beh.hesitationDetected ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
              }}>
                <span className="an-metric-emoji">{beh.hesitationDetected ? '⏸️' : '▶️'}</span>
                <span className="an-metric-key">Hesitation</span>
                <span className="an-metric-val" style={{ color: beh.hesitationDetected ? '#f59e0b' : '#22c55e' }}>
                  {beh.hesitationDetected ? 'Detected' : 'None'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* ── Speaker Profile ── */}
        {hasDemo && (
          <section className="an-card an-card-inline">
            <div className="an-card-icon">
              <User size={16} color="#9f9fa9" />
            </div>
            <div className="an-demo-content">
              <h2 className="an-card-title">Speaker Profile</h2>
              <div className="an-demo-chips">
                {beh.dominantSpeaker && (
                  <div className="an-demo-chip">
                    <span>🎙️</span>
                    <div className="an-demo-chip-text">
                      <span className="an-demo-key">Speaker</span>
                      <span className="an-demo-val">{beh.dominantSpeaker}</span>
                    </div>
                  </div>
                )}
                {beh.detectedGender && (
                  <div className="an-demo-chip">
                    <span>{beh.detectedGender.toLowerCase() === 'female' ? '👩' : '👨'}</span>
                    <div className="an-demo-chip-text">
                      <span className="an-demo-key">Gender</span>
                      <span className="an-demo-val">{beh.detectedGender.charAt(0).toUpperCase() + beh.detectedGender.slice(1)}</span>
                    </div>
                  </div>
                )}
                {beh.estimatedAge && (
                  <div className="an-demo-chip">
                    <Calendar size={14} color="#71717a" />
                    <div className="an-demo-chip-text">
                      <span className="an-demo-key">Age Range</span>
                      <span className="an-demo-val">{beh.estimatedAge}</span>
                    </div>
                  </div>
                )}
                {(langLabel || fallbackLang) && (
                  <div className="an-demo-chip">
                    <Globe size={14} color="#71717a" />
                    <div className="an-demo-chip-text">
                      <span className="an-demo-key">Language</span>
                      <span className="an-demo-val">{langLabel || fallbackLang}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Primary Emotion ── */}
        <section className="an-card">
          <div className="an-card-header">
            <div className="an-card-icon">
              <Smile size={16} color="#9f9fa9" />
            </div>
            <div>
              <h2 className="an-card-title">Primary Emotion</h2>
              <p className="an-card-sub">AI-generated emotional summary</p>
            </div>
          </div>
          <div className="an-text-box">
            <p className="an-body-text">{analysis.primary_emotion}</p>
          </div>
        </section>

        {/* ── Detailed Analysis ── */}
        <section className="an-card">
          <button
            className="an-expand-btn"
            onClick={() => setShowDetailedAnalysis(v => !v)}
          >
            <div className="an-expand-left">
              <div className="an-card-icon">
                <Brain size={16} color="#9f9fa9" />
              </div>
              <div>
                <span className="an-card-title">Detailed Analysis</span>
                <p className="an-card-sub">Deep psychological interpretation</p>
              </div>
            </div>
            {showDetailedAnalysis ? <ChevronUp size={18} color="#71717a" /> : <ChevronDown size={18} color="#71717a" />}
          </button>

          {showDetailedAnalysis && (
            <div className="an-expand-body">
              <div className="an-text-box">
                <p className="an-body-text an-body-spaced">{analysis.detailed_analysis}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── AI Chat ── */}
        <section className="an-card">
          <button
            className="an-expand-btn"
            onClick={() => setShowChat(v => !v)}
          >
            <div className="an-expand-left">
              <div className="an-card-icon">
                <MessageSquare size={16} color="#9f9fa9" />
              </div>
              <div>
                <span className="an-card-title">Chat with AI</span>
                <p className="an-card-sub">Ask questions about this analysis</p>
              </div>
            </div>
            {showChat ? <ChevronUp size={18} color="#71717a" /> : <ChevronDown size={18} color="#71717a" />}
          </button>

          {showChat && (
            <div className="an-expand-body">
              <div className="an-chat-messages" id="chat-scroll">
                {messages.length === 0 ? (
                  <div className="an-chat-empty">
                    <MessageSquare size={28} color="#3f3f46" />
                    <p>Ask anything about this analysis</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`an-msg an-msg-${msg.role}`}>
                      {msg.role === 'assistant' && (
                        <div className="an-msg-avatar">
                          <Brain size={14} color="#60a5fa" />
                        </div>
                      )}
                      <div className="an-msg-bubble">{msg.content}</div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <form className="an-chat-form" onSubmit={sendChatMessage}>
                <input
                  className="an-chat-input"
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Ask about the analysis…"
                  disabled={sendingMessage}
                />
                <button className="an-chat-send" type="submit" disabled={sendingMessage || !newMessage.trim()}>
                  {sendingMessage
                    ? <Loader2 size={16} className="an-spin" />
                    : <Send size={16} />}
                </button>
              </form>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default Analysis

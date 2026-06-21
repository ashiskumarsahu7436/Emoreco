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
  Zap,
  Activity,
  User,
  Globe,
  Calendar,
  ChevronDown,
  ChevronUp,
  Mic,
  TrendingUp,
  PauseCircle,
} from 'lucide-react'
import './Analysis.css'
import ThinkingBlock from '../components/ThinkingBlock'
import { parseAIResponse } from '../utils/parseAIResponse'
import SpeakerPopup from '../components/SpeakerPopup'

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
  const [showSpeakerPopup, setShowSpeakerPopup] = useState(false)
  const [speakerDisplayName, setSpeakerDisplayName] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
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
    setPdfLoading(true)
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])

      const beh = analysis.hume_emotions || {}
      const LANG_MAP = {
        en:'English', hi:'Hindi', ta:'Tamil', te:'Telugu', mr:'Marathi',
        bn:'Bengali', gu:'Gujarati', kn:'Kannada', ml:'Malayalam', pa:'Punjabi',
        ur:'Urdu', fr:'French', de:'German', es:'Spanish', zh:'Chinese', ja:'Japanese',
      }
      const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
      const detLang = beh.detectedLanguage?.toLowerCase() || analysis.language?.toLowerCase()
      const langLabel = LANG_MAP[detLang] || (detLang ? detLang.toUpperCase() : '—')
      const arousalLabel = { strong:'Strong', neutral:'Moderate', weak:'Weak' }[beh.dominantArousal?.toLowerCase()] || '—'
      const dateStr = new Date(analysis.created_at).toLocaleString([], {
        weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'
      })

      const metrics = [
        ['Dominant Emotion', cap(beh.dominantEmotion)],
        ['Sentiment',        cap(beh.dominantPositivity)],
        ['Vocal Strength',   arousalLabel],
        ['Speaking Rate',    cap(beh.dominantSpeakingRate)],
        ['Hesitation',       beh.hesitationDetected !== undefined ? (beh.hesitationDetected ? 'Detected' : 'None') : '—'],
        ['Language',         langLabel],
        ['Gender',           cap(beh.detectedGender)],
        ['Age Range',        beh.estimatedAge || '—'],
        ['Speaker ID',       beh.dominantSpeaker || '—'],
      ]

      const gridRows = [metrics.slice(0,3), metrics.slice(3,6), metrics.slice(6,9)]
      const gridHTML = gridRows.map(row => `
        <tr>
          ${row.map(([label]) => `<td style="font-size:9px;color:#6b7280;padding:0 6px 2px 6px;">${label}</td>`).join('')}
        </tr>
        <tr>
          ${row.map(([,val]) => `<td style="font-size:13px;font-weight:700;color:#111827;padding:0 6px 14px 6px;">${val || '—'}</td>`).join('')}
        </tr>
      `).join('')

      const clean = (text) => {
        if (!text) return ''
        const { answer } = parseAIResponse(text)
        return (answer || '').trim()
      }

      const section = (title, body) => body ? `
        <div style="margin-bottom:20px;">
          <div style="background:#dbeafe;border-left:3px solid #1d4ed8;padding:6px 10px;margin-bottom:10px;">
            <span style="font-size:9px;font-weight:700;color:#1d4ed8;letter-spacing:0.8px;">${title}</span>
          </div>
          <div style="font-size:10.5px;color:#374151;line-height:1.7;text-align:justify;padding:0 4px;">${body}</div>
        </div>
      ` : ''

      const transcriptTitle = `TRANSCRIPTION${langLabel !== '—' ? '  ·  ' + langLabel : ''}`

      const html = `
        <div id="pdf-root" style="
          width:794px;background:#fff;color:#111827;padding:48px 52px;
          font-family:'Segoe UI',system-ui,Arial,sans-serif;box-sizing:border-box;
        ">
          <div style="border-top:5px solid #1d4ed8;padding-top:22px;display:flex;justify-content:space-between;align-items:flex-start;">
            <span style="font-size:26px;font-weight:700;color:#1d4ed8;letter-spacing:-0.5px;">EMORECO</span>
            <span style="font-size:9px;color:#6b7280;margin-top:6px;">Report #${id}</span>
          </div>
          <div style="font-size:12px;color:#111827;font-weight:600;margin:10px 0 3px;">Voice Emotion Analysis Report</div>
          <div style="font-size:9px;color:#6b7280;margin-bottom:18px;">Generated: ${dateStr}${analysis.space_name ? '   ·   Space: ' + analysis.space_name : ''}</div>
          <div style="height:1px;background:#e5e7eb;margin-bottom:18px;"></div>

          <div style="font-size:9px;font-weight:700;color:#1d4ed8;letter-spacing:1px;margin-bottom:12px;">VOICE ANALYSIS</div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">${gridHTML}</table>
          <div style="height:1px;background:#e5e7eb;margin-bottom:20px;"></div>

          ${section(transcriptTitle, analysis.transcription || '')}
          ${section('PRIMARY EMOTION', clean(analysis.primary_emotion))}
          ${section('DETAILED ANALYSIS', clean(analysis.detailed_analysis))}

          <div style="height:1px;background:#e5e7eb;margin-top:8px;margin-bottom:8px;"></div>
          <div style="font-size:8px;color:#9ca3af;text-align:center;">Generated by EMORECO · Voice-Based AI Emotion Recognition · Confidential</div>
        </div>
      `

      const container = document.createElement('div')
      container.style.cssText = 'position:absolute;left:-9999px;top:0;'
      container.innerHTML = html
      document.body.appendChild(container)
      const el = container.querySelector('#pdf-root')

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      document.body.removeChild(container)

      const A4_W = 210, A4_H = 297
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const imgW = A4_W
      const imgH = (canvas.height * A4_W) / canvas.width
      let yOffset = 0

      while (yOffset < imgH) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(canvas, 'PNG', 0, -yOffset, imgW, imgH)
        yOffset += A4_H
      }

      pdf.save(`emotion-analysis-${id}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Failed to generate PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const EMOTION_MAP = {
    angry:   { emoji: '😠', label: 'Angry',   color: '#ef4444' },
    happy:   { emoji: '😊', label: 'Happy',   color: '#22c55e' },
    heavy:   { emoji: '😔', label: 'Heavy',   color: '#a78bfa' },
    sad:     { emoji: '😢', label: 'Sad',     color: '#60a5fa' },
    neutral: { emoji: '😐', label: 'Neutral', color: '#9f9fa9' },
  }

  const POSITIVITY_MAP = {
    positive: { emoji: '😊', label: 'Positive', color: '#22c55e' },
    neutral:  { emoji: '😶', label: 'Neutral',  color: '#9f9fa9' },
    negative: { emoji: '😟', label: 'Negative', color: '#ef4444' },
  }

  const AROUSAL_MAP = {
    strong:  { label: 'Strong',   color: '#f59e0b', pct: 100 },
    neutral: { label: 'Moderate', color: '#60a5fa', pct: 55  },
    weak:    { label: 'Weak',     color: '#6b7280', pct: 20  },
  }

  const RATE_MAP = {
    fast:   { emoji: '🚀', label: 'Fast',   color: '#ef4444' },
    normal: { emoji: '🚶', label: 'Normal', color: '#22c55e' },
    slow:   { emoji: '🐢', label: 'Slow',   color: '#60a5fa' },
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

  const emotion    = EMOTION_MAP[beh.dominantEmotion?.toLowerCase()] || null
  const positivity = POSITIVITY_MAP[beh.dominantPositivity?.toLowerCase()] || null
  const arousal    = AROUSAL_MAP[beh.dominantArousal?.toLowerCase()] || null
  const rate       = RATE_MAP[beh.dominantSpeakingRate?.toLowerCase()] || null
  const langLabel  = LANG_MAP[beh.detectedLanguage?.toLowerCase()] || (beh.detectedLanguage ? beh.detectedLanguage.toUpperCase() : null)
  const fallbackLang = LANG_MAP[analysis.language?.toLowerCase()] || analysis.language?.toUpperCase()
  const displayLang = langLabel || fallbackLang

  const genderLabel = beh.detectedGender
    ? beh.detectedGender.charAt(0).toUpperCase() + beh.detectedGender.slice(1)
    : null
  const genderEmoji = beh.detectedGender?.toLowerCase() === 'female' ? '👩'
    : beh.detectedGender?.toLowerCase() === 'male' ? '👨' : null

  const fmt = (d) => new Date(d).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })

  const NA = <span className="an-sb-na">—</span>

  return (
    <div className="an-page">
      <div className="an-outer">

        {/* ── Header ── */}
        <div className="an-header">
          <div className="an-header-left">
            <button className="an-back-btn" onClick={() => navigate('/history')}>
              <ArrowLeft size={15} /> Back to History
            </button>
            <span className="an-date">{fmt(analysis.created_at)}</span>
          </div>
          <button className="an-download-btn" onClick={downloadPDF} disabled={pdfLoading}>
            {pdfLoading
              ? <><Loader2 size={15} className="an-spin" /> Generating…</>
              : <><Download size={15} /> Export PDF</>
            }
          </button>
        </div>

        {/* ── Two-column layout ── */}
        <div className="an-layout">

          {/* ── LEFT: main content ── */}
          <div className="an-main">

            {/* Transcription */}
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

            {/* Primary Emotion */}
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
                {(() => {
                  const { thinking, answer } = parseAIResponse(analysis.primary_emotion)
                  return (
                    <>
                      {thinking && <ThinkingBlock thinking={thinking} />}
                      <p className="an-body-text">{answer}</p>
                    </>
                  )
                })()}
              </div>
            </section>

            {/* Detailed Analysis */}
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
                    {(() => {
                      const { thinking, answer } = parseAIResponse(analysis.detailed_analysis)
                      return (
                        <>
                          {thinking && <ThinkingBlock thinking={thinking} />}
                          <p className="an-body-text an-body-spaced">{answer}</p>
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}
            </section>

            {/* AI Chat */}
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
                  <div className="an-chat-messages">
                    {messages.length === 0 ? (
                      <div className="an-chat-empty">
                        <MessageSquare size={28} color="#3f3f46" />
                        <p>Ask anything about this analysis</p>
                      </div>
                    ) : (
                      messages.map((msg, i) => {
                        if (msg.role === 'assistant') {
                          const { thinking, answer } = parseAIResponse(msg.content)
                          return (
                            <div key={i} className="an-msg an-msg-assistant">
                              <div className="an-msg-avatar">
                                <Brain size={14} color="#60a5fa" />
                              </div>
                              <div className="an-msg-bubble">
                                {thinking && <ThinkingBlock thinking={thinking} />}
                                {answer}
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={i} className="an-msg an-msg-user">
                            <div className="an-msg-bubble">{msg.content}</div>
                          </div>
                        )
                      })
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

          {/* ── RIGHT: Voice Analysis Sidebar — always visible ── */}
          <aside className="an-sidebar">
            <div className="an-sb-header">
              <div className="an-sb-icon">
                <Activity size={15} color="#60a5fa" />
              </div>
              <div>
                <h3 className="an-sb-title">Voice Analysis</h3>
                <p className="an-sb-sub">Behavioral Signals API</p>
              </div>
            </div>

            <div className="an-sb-section-label">Speaker</div>
            <div className="an-sb-rows">

              <div className="an-sb-row">
                <div className="an-sb-label"><Globe size={12} />Language</div>
                <span className="an-sb-val">{displayLang || NA}</span>
              </div>

              <div className="an-sb-row">
                <div className="an-sb-label"><User size={12} />Gender</div>
                <span className="an-sb-val">
                  {genderLabel ? (<>{genderEmoji && <span className="an-sb-emoji">{genderEmoji}</span>}{genderLabel}</>) : NA}
                </span>
              </div>

              <div className="an-sb-row">
                <div className="an-sb-label"><Calendar size={12} />Age Range</div>
                <span className="an-sb-val">{beh.estimatedAge || NA}</span>
              </div>

              {beh.dominantSpeaker && (
                <div
                  className="an-sb-row an-sb-row-clickable"
                  onClick={() => setShowSpeakerPopup(true)}
                  title="Click to rename or create a speaker profile"
                >
                  <div className="an-sb-label"><Mic size={12} />Speaker ID</div>
                  <span className="an-sb-val an-sb-mono an-sb-speaker-chip">
                    {speakerDisplayName || beh.dominantSpeaker}
                    <span className="an-sb-edit-hint">✎</span>
                  </span>
                </div>
              )}

            </div>

            <div className="an-sb-section-label">Emotion</div>
            <div className="an-sb-rows">

              <div className="an-sb-row">
                <div className="an-sb-label">
                  <span className="an-sb-dot" style={{ background: emotion?.color || '#3f3f46' }} />
                  Emotion
                </div>
                <span className="an-sb-val" style={{ color: emotion?.color }}>
                  {emotion ? (<><span className="an-sb-emoji">{emotion.emoji}</span>{emotion.label}</>) : NA}
                </span>
              </div>

              <div className="an-sb-row">
                <div className="an-sb-label">
                  <span className="an-sb-dot" style={{ background: positivity?.color || '#3f3f46' }} />
                  Sentiment
                </div>
                <span className="an-sb-val" style={{ color: positivity?.color }}>
                  {positivity ? (<><span className="an-sb-emoji">{positivity.emoji}</span>{positivity.label}</>) : NA}
                </span>
              </div>

            </div>

            <div className="an-sb-section-label">Vocal Patterns</div>
            <div className="an-sb-rows">

              <div className="an-sb-row an-sb-row-col">
                <div className="an-sb-row-inner">
                  <div className="an-sb-label"><Zap size={12} />Vocal Strength</div>
                  <span className="an-sb-val" style={{ color: arousal?.color }}>
                    {arousal ? arousal.label : NA}
                  </span>
                </div>
                <div className="an-sb-bar-track">
                  <div
                    className="an-sb-bar-fill"
                    style={{
                      width: arousal ? `${arousal.pct}%` : '0%',
                      background: arousal?.color || '#3f3f46'
                    }}
                  />
                </div>
              </div>

              <div className="an-sb-row">
                <div className="an-sb-label"><TrendingUp size={12} />Speaking Rate</div>
                <span className="an-sb-val" style={{ color: rate?.color }}>
                  {rate ? (<><span className="an-sb-emoji">{rate.emoji}</span>{rate.label}</>) : NA}
                </span>
              </div>

              <div className="an-sb-row">
                <div className="an-sb-label"><PauseCircle size={12} />Hesitation</div>
                <span
                  className="an-sb-val"
                  style={{
                    color: beh.hesitationDetected !== undefined
                      ? (beh.hesitationDetected ? '#f59e0b' : '#22c55e')
                      : undefined
                  }}
                >
                  {beh.hesitationDetected !== undefined
                    ? (<><span className="an-sb-emoji">{beh.hesitationDetected ? '⏸️' : '▶️'}</span>{beh.hesitationDetected ? 'Detected' : 'None'}</>)
                    : NA}
                </span>
              </div>

            </div>

            <div className="an-sb-footer">
              Powered by Behavioral Signals v5
            </div>
          </aside>

        </div>
      </div>

      {showSpeakerPopup && beh.dominantSpeaker && (
        <SpeakerPopup
          analysisId={parseInt(id)}
          speakerLabel={beh.dominantSpeaker}
          onClose={() => setShowSpeakerPopup(false)}
          onSaved={({ displayName }) => setSpeakerDisplayName(displayName)}
        />
      )}
    </div>
  )
}

export default Analysis

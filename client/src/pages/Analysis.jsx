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
                      <div 
                        key={idx} 
                        className={`chat-message ${msg.role}`}
                      >
                        <div className="message-content">
                          {msg.content}
                        </div>
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

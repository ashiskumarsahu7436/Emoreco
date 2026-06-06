import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [spaces, setSpaces] = useState([])
  const [stats, setStats] = useState({ total: 0, recordings: 0, savedSpaces: 0 })
  const [recentActivity, setRecentActivity] = useState([])
  const [userName, setUserName] = useState('there')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.name) setUserName(user.name.split(' ')[0])
    fetchData()
  }, [navigate])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [spacesRes, analysesRes] = await Promise.all([
        axios.get('/api/spaces', { headers }),
        axios.get('/api/analyses', { headers })
      ])
      const spacesData = spacesRes.data
      const analysesData = analysesRes.data
      setSpaces(spacesData)
      setStats({
        total: analysesData.length,
        recordings: analysesData.length,
        savedSpaces: spacesData.length
      })
      setRecentActivity(analysesData.slice(0, 5))
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []
      mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioFile(blob)
      }
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch {
      alert('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
      setIsRecording(false)
    }
  }

  const closeRecordModal = () => {
    setShowRecordModal(false)
    setIsRecording(false)
    setAudioFile(null)
    setSelectedSpace(null)
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  const analyzeRecording = async () => {
    if (!audioFile) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      if (selectedSpace) formData.append('spaceId', selectedSpace)
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/analyses', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      navigate(`/analysis/${res.data.analysisId}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) setUploadFile(file)
    else alert('Please drop an audio file.')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) setUploadFile(file)
  }

  const analyzeUpload = async () => {
    if (!uploadFile) return
    setUploadLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', uploadFile)
      if (selectedSpace) formData.append('spaceId', selectedSpace)
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/analyses', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      navigate(`/analysis/${res.data.analysisId}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setUploadLoading(false)
    }
  }

  const formatTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  const getEmotionColor = (emotion) => {
    if (!emotion) return '#9f9fa9'
    const e = emotion.toLowerCase()
    if (e.includes('joy') || e.includes('happy')) return '#00bc7d'
    if (e.includes('calm') || e.includes('neutral')) return '#f59e0b'
    if (e.includes('sad') || e.includes('anxiety') || e.includes('fear')) return '#ef4444'
    if (e.includes('anger') || e.includes('angry')) return '#ef4444'
    if (e.includes('surprise')) return '#8b5cf6'
    return '#155dfc'
  }

  const getEmotionLabel = (emotion) => {
    if (!emotion) return 'Unknown'
    const words = emotion.trim().split(/\s+/)
    return words[0].charAt(0).toUpperCase() + words[0].slice(1)
  }

  return (
    <div className="db-page">
      <div className="db-container">

        {/* Welcome Row */}
        <div className="db-welcome-row">
          <div>
            <h1 className="db-welcome-title">Welcome back, {userName}</h1>
            <p className="db-welcome-sub">Capture a voice note or upload audio to begin emotion analysis.</p>
          </div>
          <div className="db-status-badge">
            <span className="db-status-dot" />
            All systems operational
          </div>
        </div>

        {/* Action Cards */}
        <div className="db-cards-grid">

          {/* Record Card */}
          <div className="db-card db-card-record">
            <div className="db-card-record-bg" />
            <div className="db-card-record-gradient" />
            <div className="db-card-body">
              <div className="db-card-icon db-card-icon-blue">
                <MicIcon />
              </div>
              <h2 className="db-card-title">Record with Microphone</h2>
              <p className="db-card-desc">Start a live recording directly from your browser and analyze emotion in real time.</p>
            </div>
            <button className="db-btn-primary" onClick={() => navigate('/record')}>
              <MicIconSm /> Start Recording
            </button>
          </div>

          {/* Upload Card */}
          <div className="db-card db-card-upload">
            <div className="db-card-body">
              <div className="db-card-icon db-card-icon-dark">
                <UploadIcon />
              </div>
              <h2 className="db-card-title">Upload Audio File</h2>
              <p className="db-card-desc">Drop an existing recording (MP3, WAV, M4A) to run a full emotion analysis.</p>
            </div>
            <div
              className={`db-dropzone${isDragging ? ' db-dropzone-active' : ''}${uploadFile ? ' db-dropzone-ready' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <UploadCloudIcon />
              <span className="db-dropzone-text">
                {uploadFile ? uploadFile.name : 'Drag & drop or click to browse'}
              </span>
            </div>
            <div className="db-upload-row">
              <button className="db-btn-ghost" onClick={() => fileInputRef.current?.click()}>
                <FileIcon /> Choose File
              </button>
              {uploadFile && (
                <button
                  className="db-btn-primary"
                  onClick={analyzeUpload}
                  disabled={uploadLoading}
                >
                  {uploadLoading ? 'Analyzing...' : 'Analyze'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="db-stats-grid">
          <div className="db-stat-card">
            <div className="db-stat-header">
              <span className="db-stat-label">Total Analyses</span>
              <WaveformIcon color="#155dfc" />
            </div>
            <div className="db-stat-value">{stats.total}</div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-header">
              <span className="db-stat-label">Recordings</span>
              <MicIconStat color="#00bc7d" />
            </div>
            <div className="db-stat-value">{stats.recordings}</div>
          </div>
          <div className="db-stat-card">
            <div className="db-stat-header">
              <span className="db-stat-label">Saved Spaces</span>
              <FolderIcon color="#8b5cf6" />
            </div>
            <div className="db-stat-value">{stats.savedSpaces}</div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="db-recent-card">
          <div className="db-recent-header">
            <div className="db-recent-title">
              <ClockIcon />
              Recent Activity
            </div>
            <button className="db-view-all" onClick={() => navigate('/history')}>
              View all <ArrowIcon />
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="db-empty">No analyses yet. Record or upload audio to get started.</div>
          ) : (
            <div className="db-activity-list">
              {recentActivity.map((item, i) => (
                <div
                  key={item.id}
                  className="db-activity-row"
                  onClick={() => navigate(`/analysis/${item.id}`)}
                >
                  <div className="db-activity-icon">
                    <MicIconSm />
                  </div>
                  <div className="db-activity-info">
                    <span className="db-activity-name">
                      {item.space_name || `Recording #${String(item.id).padStart(3, '0')}`}
                    </span>
                    <span className="db-activity-meta">
                      {item.language ? item.language.toUpperCase() : 'EN'}
                    </span>
                  </div>
                  <div className="db-activity-right">
                    <span
                      className="db-emotion-badge"
                      style={{ '--emotion-color': getEmotionColor(item.primary_emotion) }}
                    >
                      <span className="db-emotion-dot" />
                      {getEmotionLabel(item.primary_emotion)}
                    </span>
                    <span className="db-activity-time">{formatTimeAgo(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Modal */}
      {showRecordModal && (
        <div className="db-modal-overlay" onClick={closeRecordModal}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-header">
              <h2 className="db-modal-title">Record Audio</h2>
              <button className="db-modal-close" onClick={closeRecordModal}>
                <CloseIcon />
              </button>
            </div>

            <div className="db-modal-space">
              <label className="db-modal-label">Space (optional)</label>
              <select
                className="db-modal-select"
                value={selectedSpace || ''}
                onChange={e => setSelectedSpace(e.target.value || null)}
              >
                <option value="">General Analysis</option>
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="db-recording-area">
              <div className={`db-rec-indicator${isRecording ? ' db-rec-active' : ''}`}>
                <div className="db-rec-icon-wrap">
                  <MicIcon />
                </div>
                {isRecording && <div className="db-rec-pulse" />}
              </div>
              <p className="db-rec-status">{isRecording ? 'Recording...' : audioFile ? 'Ready to analyze' : 'Ready to record'}</p>
            </div>

            <div className="db-modal-actions">
              {!isRecording && !audioFile && (
                <button className="db-btn-primary db-btn-wide" onClick={startRecording}>
                  <MicIconSm /> Start Recording
                </button>
              )}
              {isRecording && (
                <button className="db-btn-stop db-btn-wide" onClick={stopRecording}>
                  <StopIcon /> Stop Recording
                </button>
              )}
              {audioFile && !isRecording && (
                <button className="db-btn-primary db-btn-wide" onClick={analyzeRecording} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Analyze Audio'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}
function MicIconSm() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}
function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}
function UploadCloudIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16"/>
      <line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  )
}
function WaveformIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}
function MicIconStat({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}
function FolderIcon({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  )
}
function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export default Dashboard

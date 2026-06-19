import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './NewRecording.css'

const LANGUAGES = ['English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Chinese']

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function NewRecording() {
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const audioCtxRef = useRef(null)
  const mimeTypeRef = useRef('audio/webm')

  const [phase, setPhase] = useState('idle') // idle | recording | paused | stopped
  const [elapsed, setElapsed] = useState(0)
  const [audioFile, setAudioFile] = useState(null)
  const [title, setTitle] = useState('Recording #001')
  const [language, setLanguage] = useState('English (US)')
  const [autoAnalyze, setAutoAnalyze] = useState(true)
  const [volume, setVolume] = useState(0)       // 0-100
  const [volumeDb, setVolumeDb] = useState(-60)
  const [clarity, setClarity] = useState(0)     // 0-100
  const [loading, setLoading] = useState(false)
  const [recordingCount, setRecordingCount] = useState(1)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    // Fetch analysis count to set recording number
    axios.get('/api/analyses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const n = (r.data?.length || 0) + 1
        setRecordingCount(n)
        setTitle(`Recording #${String(n).padStart(3, '0')}`)
      }).catch(() => {})
  }, [navigate])

  // Canvas animation
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)

    if (analyserRef.current && phase === 'recording') {
      const bufLen = analyserRef.current.frequencyBinCount
      const dataArr = new Uint8Array(bufLen)
      analyserRef.current.getByteFrequencyData(dataArr)

      // Volume calculation
      let sum = 0
      for (let i = 0; i < bufLen; i++) sum += dataArr[i]
      const avg = sum / bufLen
      const vol = Math.min(100, (avg / 128) * 100 * 2)
      setVolume(vol)
      const db = avg > 0 ? Math.round(20 * Math.log10(avg / 128)) : -60
      setVolumeDb(Math.max(-60, Math.min(0, db)))

      // Clarity from high-frequency content
      const highFreqSlice = dataArr.slice(Math.floor(bufLen * 0.6))
      const highAvg = highFreqSlice.reduce((a, b) => a + b, 0) / highFreqSlice.length
      setClarity(Math.min(100, (highAvg / 80) * 100))

      // Draw bars
      const barCount = 38
      const barW = 5
      const gap = (W - barCount * barW) / (barCount + 1)
      const step = Math.floor(bufLen / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArr[i * step] / 255
        const barH = Math.max(4, value * H * 0.75)
        const x = gap + i * (barW + gap)
        const y = (H - barH) / 2

        // Blue gradient bars
        const grad = ctx.createLinearGradient(0, y, 0, y + barH)
        grad.addColorStop(0, 'rgba(99, 179, 237, 0.9)')
        grad.addColorStop(0.5, 'rgba(59, 130, 246, 1)')
        grad.addColorStop(1, 'rgba(99, 179, 237, 0.9)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(x, y, barW, barH, 2)
        ctx.fill()
      }
    } else {
      // Idle / paused: flat ambient bars
      const barCount = 38
      const barW = 5
      const gap = (W - barCount * barW) / (barCount + 1)
      const t = Date.now() / 1000

      for (let i = 0; i < barCount; i++) {
        const wave = Math.sin(t * 0.6 + i * 0.35) * 0.15 + 0.12
        const barH = Math.max(3, wave * (H * 0.4))
        const x = gap + i * (barW + gap)
        const y = (H - barH) / 2
        ctx.fillStyle = phase === 'paused'
          ? 'rgba(148, 163, 184, 0.3)'
          : 'rgba(71, 85, 105, 0.4)'
        ctx.beginPath()
        ctx.roundRect(x, y, barW, barH, 2)
        ctx.fill()
      }
    }

    animFrameRef.current = requestAnimationFrame(drawWaveform)
  }, [phase])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawWaveform)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [drawWaveform])

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // AudioContext for analysis
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyserRef.current = analyser

      // Detect the actual MIME type the browser supports
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ]
      const supportedMime = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || ''
      mimeTypeRef.current = supportedMime || 'audio/webm'

      // MediaRecorder
      const mr = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : {})
      mediaRecorderRef.current = mr
      audioChunksRef.current = []
      mr.ondataavailable = e => audioChunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current })
        setAudioFile(blob)
      }
      mr.start()
      setPhase('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      clearInterval(timerRef.current)
      setPhase('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
      setPhase('recording')
    }
  }

  const stopAndAnalyze = async () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      analyserRef.current = null
      setPhase('stopped')

      // Wait for blob then auto-analyze if toggle is on
      if (autoAnalyze) {
        setTimeout(() => submitAnalysis(), 400)
      }
    }
  }

  const resetRecording = () => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    analyserRef.current = null
    audioChunksRef.current = []
    setAudioFile(null)
    setElapsed(0)
    setVolume(0)
    setVolumeDb(-60)
    setClarity(0)
    setPhase('idle')
  }

  const submitAnalysis = async () => {
    const mime = mimeTypeRef.current || 'audio/webm'
    const ext = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm'
    const blob = new Blob(audioChunksRef.current, { type: mime })
    if (!blob.size) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, `${title}.${ext}`)
      formData.append('sourceType', 'mic')
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/analyses', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      navigate(`/analysis/${res.data.analysisId}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Analysis failed. Please try again.')
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      audioCtxRef.current?.close()
    }
  }, [])

  const isRecording = phase === 'recording'
  const isPaused = phase === 'paused'
  const isStopped = phase === 'stopped'
  const isIdle = phase === 'idle'

  const clarityLabel = clarity > 66 ? 'Good' : clarity > 33 ? 'Fair' : 'Weak'
  const clarityColor = clarity > 66 ? '#3b82f6' : clarity > 33 ? '#f59e0b' : '#ef4444'

  return (
    <div className="nr-page">
      {/* ── Breadcrumb + Title ── */}
      <div className="nr-header">
        <div className="nr-breadcrumb">
          <Link to="/dashboard">Dashboard</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span>New Recording</span>
        </div>
        <div className="nr-title-row">
          <div>
            <h1>Record with Microphone</h1>
            <p>Capture a live voice note and analyze emotion the moment you stop.</p>
          </div>
          {isRecording && (
            <div className="nr-rec-badge">
              <span className="nr-rec-dot" />
              Recording in progress
            </div>
          )}
          {isPaused && (
            <div className="nr-rec-badge paused">
              <span className="nr-rec-dot paused" />
              Paused
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="nr-layout">

        {/* Left: Visualizer */}
        <div className="nr-viz-panel">
          {/* Dark stage with gradient */}
          <div className="nr-stage">
            <div className="nr-stage-bg" />
            <div className="nr-stage-overlay" />

            {/* Timer */}
            <div className="nr-timer">
              <span className="nr-timer-dot" />
              {formatTime(elapsed)}
            </div>

            {/* Waveform canvas */}
            <div className="nr-canvas-wrap">
              <canvas ref={canvasRef} className="nr-canvas" />
            </div>
          </div>

          {/* Controls */}
          <div className="nr-controls">
            <button className="nr-ctrl-btn" onClick={resetRecording} title="Restart" disabled={isIdle && elapsed === 0}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.56"/>
              </svg>
            </button>

            {isIdle && (
              <button className="nr-stop-btn start" onClick={startRecording}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            )}
            {(isRecording || isPaused) && (
              <button className="nr-stop-btn" onClick={stopAndAnalyze} title="Stop">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              </button>
            )}
            {isStopped && (
              <button className="nr-stop-btn stopped" onClick={submitAnalysis} disabled={loading}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            )}

            {isRecording && (
              <button className="nr-ctrl-btn" onClick={pauseRecording} title="Pause">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/>
                </svg>
              </button>
            )}
            {isPaused && (
              <button className="nr-ctrl-btn" onClick={resumeRecording} title="Resume">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            )}
            {(isIdle || isStopped) && (
              <button className="nr-ctrl-btn" disabled>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/>
                </svg>
              </button>
            )}
          </div>

          {/* Mic label */}
          <div className="nr-mic-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
            {isIdle ? 'Click the mic to start recording' : 'Listening on Built-in Microphone'}
          </div>
        </div>

        {/* Right: Details panel */}
        <div className="nr-details-panel">

          {/* Recording Details */}
          <div className="nr-details-card">
            <div className="nr-details-header">
              <h3>Recording Details</h3>
              <p>Set how this clip is processed.</p>
            </div>

            <div className="nr-field">
              <label>Title</label>
              <div className="nr-input-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                </svg>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="nr-field">
              <label>Language</label>
              <div className="nr-select-wrap">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                </select>
                <svg className="nr-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>

            <div className="nr-toggle-row">
              <div className="nr-toggle-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Auto-analyze on stop
              </div>
              <button
                className={`nr-toggle ${autoAnalyze ? 'on' : 'off'}`}
                onClick={() => setAutoAnalyze(v => !v)}
              >
                <span className="nr-toggle-thumb" />
              </button>
            </div>
          </div>

          {/* Live Levels */}
          <div className="nr-levels-card">
            <h3>Live Levels</h3>

            <div className="nr-level-row">
              <div className="nr-level-labels">
                <span>Input Volume</span>
                <span className="nr-level-value">{isRecording ? `${volumeDb} dB` : '— dB'}</span>
              </div>
              <div className="nr-level-track">
                <div
                  className="nr-level-fill volume"
                  style={{ width: `${isRecording ? volume : 0}%` }}
                />
              </div>
            </div>

            <div className="nr-level-row">
              <div className="nr-level-labels">
                <span>Clarity</span>
                <span className="nr-level-value" style={{ color: isRecording ? clarityColor : '#52525b' }}>
                  {isRecording ? clarityLabel : '—'}
                </span>
              </div>
              <div className="nr-level-track">
                <div
                  className="nr-level-fill clarity"
                  style={{ width: `${isRecording ? clarity : 0}%`, '--clarity-color': clarityColor }}
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            className={`nr-action-btn ${loading ? 'loading' : ''}`}
            onClick={isIdle ? startRecording : stopAndAnalyze}
            disabled={loading || isStopped}
          >
            {loading ? (
              <>
                <div className="nr-spinner" />
                Analyzing…
              </>
            ) : isIdle ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
                Start Recording
              </>
            ) : isStopped ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Analyze Recording
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Stop & Analyze
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

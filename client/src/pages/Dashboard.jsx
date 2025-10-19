import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [audioFile, setAudioFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [spaces, setSpaces] = useState([])
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchSpaces()
  }, [navigate])

  const fetchSpaces = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/spaces', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSpaces(response.data)
    } catch (err) {
      console.error('Error fetching spaces:', err)
    }
  }

  const openModal = (type) => {
    setModalType(type)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setIsRecording(false)
    setAudioFile(null)
    setSelectedSpace(null)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setAudioFile(audioBlob)
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAudioFile(file)
    }
  }

  const analyzeAudio = async () => {
    if (!audioFile) {
      alert('Please record or upload audio first')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioFile)
      if (selectedSpace) {
        formData.append('spaceId', selectedSpace)
      }

      const token = localStorage.getItem('token')
      const response = await axios.post('/api/analyze', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      navigate(`/analysis/${response.data.analysisId}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      <section className="hero-section">
        <h1>Start Your Emotion Analysis</h1>
        <p className="subtitle">Choose how you want to analyze emotions</p>

        <div className="action-cards">
          <div className="action-card" onClick={() => openModal('mic')}>
            <div className="action-icon">
              <i className="fas fa-microphone-alt"></i>
            </div>
            <h3>Live Microphone</h3>
            <p>Record your voice in real-time</p>
            <button className="action-button">Start Recording</button>
          </div>

          <div className="action-card" onClick={() => openModal('upload')}>
            <div className="action-icon">
              <i className="fas fa-upload"></i>
            </div>
            <h3>Upload Audio</h3>
            <p>Upload an audio file for analysis</p>
            <button className="action-button">Choose File</button>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={closeModal}>&times;</span>
            
            <h2>{modalType === 'mic' ? 'Record Audio' : 'Upload Audio'}</h2>

            <div className="space-selector">
              <label>Select Space (Optional):</label>
              <select 
                value={selectedSpace || ''} 
                onChange={(e) => setSelectedSpace(e.target.value || null)}
              >
                <option value="">General Analysis</option>
                {spaces.map(space => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
            </div>

            {modalType === 'mic' ? (
              <div className="recording-section">
                <div className="recording-indicator">
                  {isRecording && <div className="pulse-dot"></div>}
                  <p>{isRecording ? 'Recording...' : 'Ready to record'}</p>
                </div>

                {!isRecording ? (
                  <button className="record-btn" onClick={startRecording}>
                    <i className="fas fa-microphone"></i> Start Recording
                  </button>
                ) : (
                  <button className="stop-btn" onClick={stopRecording}>
                    <i className="fas fa-stop"></i> Stop Recording
                  </button>
                )}

                {audioFile && !isRecording && (
                  <button className="analyze-btn" onClick={analyzeAudio} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze Audio'}
                  </button>
                )}
              </div>
            ) : (
              <div className="upload-section">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  id="audioInput"
                  style={{display: 'none'}}
                />
                <label htmlFor="audioInput" className="upload-btn">
                  <i className="fas fa-cloud-upload-alt"></i> Choose Audio File
                </label>

                {audioFile && (
                  <div className="file-info">
                    <p>File: {audioFile.name || 'Recorded audio'}</p>
                    <button className="analyze-btn" onClick={analyzeAudio} disabled={loading}>
                      {loading ? 'Analyzing...' : 'Analyze Audio'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

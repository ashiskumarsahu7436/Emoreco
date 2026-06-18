import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import './History.css'

const EMOTION_COLORS = {
  joy: '#22c55e', calm: '#f59e0b', neutral: '#a855f7',
  anxiety: '#ef4444', stress: '#ef4444', anger: '#dc2626',
  fear: '#8b5cf6', sadness: '#3b82f6', excitement: '#06b6d4',
  frustration: '#f97316', surprise: '#ec4899',
  happy: '#22c55e', happiness: '#22c55e', angry: '#dc2626',
  sad: '#3b82f6', fearful: '#8b5cf6', curious: '#06b6d4',
  confused: '#f97316', hopeful: '#22c55e', worried: '#ef4444',
}

const POSITIVE_TEXT_KEYWORDS = [
  'joy', 'happy', 'happiness', 'calm', 'excited', 'excitement', 'hopeful',
  'positive', 'pleased', 'delight', 'enthusiastic', 'optimistic', 'content',
  'satisfied', 'peaceful', 'curious', 'confident', 'pride', 'grateful'
]
const NEGATIVE_TEXT_KEYWORDS = [
  'sad', 'sadness', 'anxious', 'anxiety', 'stress', 'stressed', 'angry',
  'anger', 'fear', 'fearful', 'frustrated', 'frustration', 'worried', 'worry',
  'negative', 'depressed', 'upset', 'distressed', 'unhappy', 'distress',
  'grief', 'despair', 'heavy', 'overwhelmed', 'tense', 'nervous'
]

function classifySentiment(analysis) {
  const beh = analysis.hume_emotions
  if (beh) {
    const pos = (beh.dominantPositivity || '').toLowerCase()
    if (pos === 'positive') return 'positive'
    if (pos === 'negative') return 'negative'
  }
  const text = (analysis.primary_emotion || '').toLowerCase()
  const isPos = POSITIVE_TEXT_KEYWORDS.some(k => text.includes(k))
  const isNeg = NEGATIVE_TEXT_KEYWORDS.some(k => text.includes(k))
  if (isPos && !isNeg) return 'positive'
  if (isNeg && !isPos) return 'negative'
  return 'neutral'
}

function isUpload(audioPath) {
  if (!audioPath) return false
  if (audioPath.startsWith('upload:')) return true
  if (audioPath.startsWith('mic:')) return false
  const name = audioPath.split('/').pop() || ''
  return /\.(mp3|m4a|ogg|flac|aac|aiff|opus)$/i.test(name)
}

function getEmotionColor(emotion) {
  if (!emotion) return '#71717a'
  const lower = (emotion || '').toLowerCase()
  for (const [key, color] of Object.entries(EMOTION_COLORS)) {
    if (lower.includes(key)) return color
  }
  return '#71717a'
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr)
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  const weeks = Math.floor(days / 7)
  if (mins < 5) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return `${weeks}w ago`
}

function getDisplayName(analysis, index) {
  const fallback = `Recording #${String(index + 1).padStart(3, '0')}`
  if (!analysis.audio_path) return fallback
  let path = analysis.audio_path
  if (path.startsWith('mic:') || path.startsWith('upload:')) {
    path = path.split(':').slice(1).join(':')
  }
  const file = path.split('/').pop()
  return file || fallback
}

const PAGE_SIZE = 7
const FILTERS = ['All', 'Recordings', 'Uploads', 'Positive', 'Negative']

export default function History() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const spaceId = searchParams.get('space')

  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    fetchHistory()
  }, [navigate, spaceId])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = spaceId ? `/api/analyses?spaceId=${spaceId}` : '/api/analyses'
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      setAnalyses(res.data)
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteAnalysis = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this analysis?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/analyses/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchHistory()
    } catch { alert('Failed to delete analysis') }
  }

  const filtered = useMemo(() => {
    let list = analyses
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        (a.primary_emotion || '').toLowerCase().includes(q) ||
        (a.language || '').toLowerCase().includes(q) ||
        (a.audio_path || '').toLowerCase().includes(q)
      )
    }
    if (activeFilter === 'Recordings') list = list.filter(a => !isUpload(a.audio_path))
    if (activeFilter === 'Uploads') list = list.filter(a => isUpload(a.audio_path))
    if (activeFilter === 'Positive') list = list.filter(a => classifySentiment(a) === 'positive')
    if (activeFilter === 'Negative') list = list.filter(a => classifySentiment(a) === 'negative')
    return list
  }, [analyses, search, activeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilter = (f) => { setActiveFilter(f); setPage(1) }
  const handleSearch = (e) => { setSearch(e.target.value); setPage(1) }

  const capFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'

  return (
    <div className="history-page">

      {/* ── Top bar ── */}
      <div className="history-topbar">
        <div>
          <h1>Analysis History</h1>
          <p>Browse and revisit every audio analysis you've run.</p>
        </div>
        <div className="history-top-actions">
          <div className="history-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search history..." value={search} onChange={handleSearch} />
          </div>
          <button className="history-filters-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round"/>
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="history-filters-row">
        <div className="history-filter-tabs">
          {FILTERS.map(f => (
            <button key={f} className={`hfilter-tab ${activeFilter === f ? 'active' : ''}`} onClick={() => handleFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="history-sort">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          Newest first
        </div>
      </div>

      {/* ── Table ── */}
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Recording</th>
              <th>Duration</th>
              <th>Emotion</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="table-empty">
                <div className="table-loading">
                  <div className="spinner" />
                  Loading history…
                </div>
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={5} className="table-empty">
                <div className="table-no-data">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
                  </svg>
                  <p>{analyses.length === 0 ? 'No analyses yet. Start recording or upload audio from the Dashboard.' : 'No results match your filter.'}</p>
                </div>
              </td></tr>
            ) : (
              paginated.map((analysis, i) => {
                const upload = isUpload(analysis.audio_path)
                const name = getDisplayName(analysis, (page - 1) * PAGE_SIZE + i)
                const lang = analysis.language || 'English'
                const emotion = analysis.primary_emotion || 'Unknown'
                const color = getEmotionColor(emotion)
                return (
                  <tr key={analysis.id} className="htable-row" onClick={() => navigate(`/analysis/${analysis.id}`)}>
                    <td className="htd-recording">
                      <div className={`recording-icon ${upload ? 'upload' : 'mic'}`}>
                        {upload ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                          </svg>
                        )}
                      </div>
                      <div className="recording-info">
                        <span className="recording-name">{name}</span>
                        <span className="recording-meta">{lang} · {upload ? 'Upload' : 'Recording'}</span>
                      </div>
                    </td>
                    <td className="htd-duration">—</td>
                    <td className="htd-emotion">
                      <span className="emotion-pill" style={{ '--dot': color }}>
                        <span className="epill-dot" />
                        {capFirst(emotion)}
                      </span>
                    </td>
                    <td className="htd-date">{getTimeAgo(analysis.created_at)}</td>
                    <td className="htd-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer / Pagination ── */}
      <div className="history-footer">
        <span className="history-showing">
          Showing {paginated.length} of {filtered.length} {filtered.length === 1 ? 'analysis' : 'analyses'}
        </span>
        {totalPages > 1 && (
          <div className="history-pagination">
            <button className="page-btn nav-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
              return (
                <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )
            })}
            <button className="page-btn nav-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

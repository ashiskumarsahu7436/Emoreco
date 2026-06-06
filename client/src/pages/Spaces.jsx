import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Spaces.css'

const EMOTION_COLORS = {
  joy: '#22c55e',
  calm: '#f59e0b',
  neutral: '#a855f7',
  stress: '#ef4444',
  excited: '#06b6d4',
  frustration: '#f97316',
  sadness: '#3b82f6',
  anger: '#dc2626',
  fear: '#8b5cf6',
  surprise: '#ec4899',
}

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #0d0d0d 0%, #1a0a2e 50%, #2d1b69 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 50%, #2a2a2a 100%)',
  'linear-gradient(135deg, #051937 0%, #004d7a 50%, #008793 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
]

const CARD_ICONS = [
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.91 6.91l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
]

function getTimeAgo(dateStr) {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return `${diffWeeks}w ago`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function SpaceCard({ space, index, onDelete, onView, user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const icon = CARD_ICONS[index % CARD_ICONS.length]

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const emotions = space.top_emotions || []
  const initials = getInitials(user?.name || space.person_name)

  return (
    <div className="space-card" onClick={() => onView(space.id)}>
      <div className="space-card-thumb" style={{ background: gradient }}>
        <div className="space-card-icon-badge">{icon}</div>
        <div className="space-card-menu" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button className="space-menu-btn" onClick={() => setMenuOpen(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
          {menuOpen && (
            <div className="space-dropdown">
              <button onClick={() => { onView(space.id); setMenuOpen(false) }}>View history</button>
              <button className="danger" onClick={() => { onDelete(space.id); setMenuOpen(false) }}>Delete space</button>
            </div>
          )}
        </div>
      </div>
      <div className="space-card-body">
        <div className="space-card-title-row">
          <span className="space-card-name">{space.name}</span>
        </div>
        <div className="space-card-meta">
          {space.analysis_count || 0} {space.analysis_count === 1 ? 'analysis' : 'analyses'} · Updated {getTimeAgo(space.updated_at || space.created_at)}
        </div>
        <div className="space-card-footer">
          <div className="space-emotion-badges">
            {emotions.length > 0 ? emotions.slice(0, 2).map((em, i) => (
              <span key={i} className="emotion-badge">
                <span className="emotion-dot" style={{ background: EMOTION_COLORS[em.toLowerCase()] || '#6b7280' }} />
                {em}
              </span>
            )) : (
              <span className="emotion-badge no-data">No analyses yet</span>
            )}
          </div>
          <div className="space-card-avatars">
            <div className="avatar" title={user?.name || space.person_name}>{initials}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateCard({ onClick }) {
  return (
    <div className="space-card create-card" onClick={onClick}>
      <div className="create-card-inner">
        <button className="create-plus-btn">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <p className="create-card-title">Create new space</p>
        <p className="create-card-desc">Group related recordings to track emotion trends over time.</p>
      </div>
    </div>
  )
}

const FILTERS = ['All', 'Recordings', 'Uploads', 'Shared']

export default function Spaces() {
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(u)
    fetchSpaces()
  }, [navigate])

  const fetchSpaces = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get('/api/spaces', { headers: { Authorization: `Bearer ${token}` } })
      setSpaces(res.data)
    } catch (err) {
      console.error('Error fetching spaces:', err)
    }
  }

  const createSpace = async (e) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/spaces', { name: newSpaceName, personName: '' }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewSpaceName('')
      setShowModal(false)
      fetchSpaces()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create space')
    } finally {
      setLoading(false)
    }
  }

  const deleteSpace = async (id) => {
    if (!confirm('Delete this space?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/spaces/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchSpaces()
    } catch {
      alert('Failed to delete space')
    }
  }

  const viewSpace = (id) => navigate(`/history?space=${id}`)

  const filtered = spaces.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="spaces-page">
      <div className="spaces-topbar">
        <div className="spaces-title-block">
          <h1>Your Spaces</h1>
          <p>Organize and revisit your saved emotion analyses by project.</p>
        </div>
        <div className="spaces-actions">
          <div className="spaces-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Search spaces..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="new-space-btn" onClick={() => setShowModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Space
          </button>
        </div>
      </div>

      <div className="spaces-filters-row">
        <div className="spaces-filter-tabs">
          {FILTERS.map(f => (
            <button
              key={f}
              className={`filter-tab ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >{f}</button>
          ))}
        </div>
        <div className="spaces-sort">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
          Recently updated
        </div>
      </div>

      <div className="spaces-grid">
        {filtered.map((space, i) => (
          <SpaceCard
            key={space.id}
            space={space}
            index={i}
            onDelete={deleteSpace}
            onView={viewSpace}
            user={user}
          />
        ))}
        <CreateCard onClick={() => setShowModal(true)} />
      </div>

      {showModal && (
        <div className="spaces-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="spaces-modal" onClick={e => e.stopPropagation()}>
            <div className="spaces-modal-header">
              <h2>Create new space</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="spaces-modal-sub">Group related recordings to track emotion trends over time.</p>
            <form onSubmit={createSpace}>
              <label>Space name</label>
              <input
                type="text"
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                placeholder="e.g., Podcast Episodes"
                autoFocus
                required
              />
              <div className="modal-actions">
                <button type="button" className="modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="modal-create" disabled={loading}>
                  {loading ? 'Creating…' : 'Create space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

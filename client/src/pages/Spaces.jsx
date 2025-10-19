import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Spaces.css'

function Spaces() {
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newSpace, setNewSpace] = useState({ name: '', personName: '' })
  const [loading, setLoading] = useState(false)

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

  const createSpace = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/spaces', newSpace, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewSpace({ name: '', personName: '' })
      setShowModal(false)
      fetchSpaces()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create space')
    } finally {
      setLoading(false)
    }
  }

  const deleteSpace = async (id) => {
    if (!confirm('Are you sure you want to delete this space?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/spaces/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSpaces()
    } catch (err) {
      alert('Failed to delete space')
    }
  }

  const viewSpaceHistory = (spaceId) => {
    navigate(`/history?space=${spaceId}`)
  }

  return (
    <div className="spaces-page">
      <div className="spaces-header">
        <h1>My Spaces</h1>
        <p className="subtitle">Create spaces to track specific persons over time</p>
        <button className="create-btn" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> Create New Space
        </button>
      </div>

      <div className="spaces-grid">
        {spaces.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <p>No spaces yet. Create your first space to start tracking!</p>
          </div>
        ) : (
          spaces.map(space => (
            <div key={space.id} className="space-card">
              <div className="space-header">
                <h3>{space.name}</h3>
                <button className="delete-btn" onClick={() => deleteSpace(space.id)}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
              <p className="person-name">
                <i className="fas fa-user"></i> {space.person_name}
              </p>
              <p className="analysis-count">
                <i className="fas fa-chart-line"></i> {space.analysis_count || 0} analyses
              </p>
              <button className="view-btn" onClick={() => viewSpaceHistory(space.id)}>
                View History
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-btn" onClick={() => setShowModal(false)}>&times;</span>
            <h2>Create New Space</h2>

            <form onSubmit={createSpace} className="space-form">
              <div className="form-group">
                <label>Space Name</label>
                <input
                  type="text"
                  value={newSpace.name}
                  onChange={(e) => setNewSpace({...newSpace, name: e.target.value})}
                  placeholder="e.g., John's Analysis"
                  required
                />
              </div>

              <div className="form-group">
                <label>Person Name</label>
                <input
                  type="text"
                  value={newSpace.personName}
                  onChange={(e) => setNewSpace({...newSpace, personName: e.target.value})}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Creating...' : 'Create Space'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Spaces

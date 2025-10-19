import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import './History.css'

function History() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const spaceId = searchParams.get('space')
  
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchHistory()
  }, [navigate, spaceId])

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = spaceId 
        ? `/api/analyses?spaceId=${spaceId}` 
        : '/api/analyses?limit=50'
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAnalyses(response.data)
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  const deleteAnalysis = async (e, analysisId) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this analysis?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`/api/analyses/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchHistory()
    } catch (err) {
      alert('Failed to delete analysis')
    }
  }

  const clearAllHistory = async () => {
    const message = spaceId 
      ? 'Are you sure you want to clear all history in this space?' 
      : 'Are you sure you want to clear all general history?'
    
    if (!confirm(message)) return

    try {
      const token = localStorage.getItem('token')
      const url = spaceId ? `/api/analyses?spaceId=${spaceId}` : '/api/analyses'
      
      await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchHistory()
    } catch (err) {
      alert('Failed to clear history')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <div className="header-content">
          <div>
            <h1>{spaceId ? 'Space History' : 'Recent Analyses'}</h1>
            <p className="subtitle">
              {spaceId ? 'All analyses in this space' : 'Your last 50 analyses'}
            </p>
          </div>
          {analyses.length > 0 && (
            <button className="clear-all-btn" onClick={clearAllHistory}>
              <i className="fas fa-trash-alt"></i> Clear All History
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading history...</p>
        </div>
      ) : analyses.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-history"></i>
          <p>No analysis history yet. Start analyzing to see results here!</p>
        </div>
      ) : (
        <div className="history-list">
          {analyses.map(analysis => (
            <div 
              key={analysis.id} 
              className="history-item"
              onClick={() => navigate(`/analysis/${analysis.id}`)}
            >
              <div className="item-header">
                <h3>{analysis.space_name || 'General Analysis'}</h3>
                <span className="date">{formatDate(analysis.created_at)}</span>
              </div>
              
              <p className="transcription-preview">
                {analysis.transcription?.substring(0, 100)}
                {analysis.transcription?.length > 100 && '...'}
              </p>
              
              <div className="item-footer">
                <span className="language">
                  <i className="fas fa-language"></i> {analysis.language || 'English'}
                </span>
                <div className="item-actions">
                  <button 
                    className="delete-item-btn" 
                    onClick={(e) => deleteAnalysis(e, analysis.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                  <button className="view-btn">
                    View Details <i className="fas fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default History

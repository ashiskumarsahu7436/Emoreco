import { useState, useEffect, useRef } from 'react'
import { X, User, FolderPlus, Check, ChevronDown, Loader2 } from 'lucide-react'
import axios from 'axios'
import './SpeakerPopup.css'

function SpeakerPopup({ analysisId, speakerLabel, onClose, onSaved }) {
  const [tab, setTab] = useState('rename')
  const [displayName, setDisplayName] = useState('')
  const [spaces, setSpaces] = useState([])
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [newSpaceName, setNewSpaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [spaceMode, setSpaceMode] = useState('new')
  const overlayRef = useRef(null)

  const token = localStorage.getItem('token')
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get('/api/spaces', { headers }).then(r => setSpaces(r.data)).catch(() => {})
  }, [])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleSave = async () => {
    if (!displayName.trim()) return
    setLoading(true)
    try {
      let spaceId = null

      if (tab === 'profile') {
        if (spaceMode === 'new') {
          if (!newSpaceName.trim()) { setLoading(false); return }
          const spaceRes = await axios.post('/api/spaces', {
            name: newSpaceName.trim(),
            personName: displayName.trim()
          }, { headers })
          spaceId = spaceRes.data.id
        } else {
          spaceId = selectedSpaceId ? parseInt(selectedSpaceId) : null
        }
      }

      await axios.post('/api/speakers', {
        displayName: displayName.trim(),
        spaceId,
        analysisId
      }, { headers })

      setSaved(true)
      setTimeout(() => {
        onSaved({ displayName: displayName.trim(), spaceId })
        onClose()
      }, 800)
    } catch (err) {
      console.error('Save speaker profile error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sp-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="sp-popup">
        <div className="sp-header">
          <div className="sp-header-left">
            <div className="sp-avatar">
              <User size={14} color="#60a5fa" />
            </div>
            <div>
              <p className="sp-title">Speaker Profile</p>
              <p className="sp-subtitle">{speakerLabel}</p>
            </div>
          </div>
          <button className="sp-close" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="sp-tabs">
          <button
            className={`sp-tab ${tab === 'rename' ? 'sp-tab-active' : ''}`}
            onClick={() => setTab('rename')}
          >
            Rename
          </button>
          <button
            className={`sp-tab ${tab === 'profile' ? 'sp-tab-active' : ''}`}
            onClick={() => setTab('profile')}
          >
            <FolderPlus size={12} /> Create Space
          </button>
        </div>

        <div className="sp-body">
          <div className="sp-field">
            <label className="sp-label">Display Name</label>
            <input
              className="sp-input"
              type="text"
              placeholder={`e.g. "Rahul" or "Client A"`}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          {tab === 'profile' && (
            <>
              <div className="sp-field">
                <label className="sp-label">Assign to Space</label>
                <div className="sp-toggle-row">
                  <button
                    className={`sp-toggle ${spaceMode === 'new' ? 'sp-toggle-active' : ''}`}
                    onClick={() => setSpaceMode('new')}
                  >New Space</button>
                  <button
                    className={`sp-toggle ${spaceMode === 'existing' ? 'sp-toggle-active' : ''}`}
                    onClick={() => setSpaceMode('existing')}
                    disabled={spaces.length === 0}
                  >Existing Space</button>
                </div>
              </div>

              {spaceMode === 'new' ? (
                <div className="sp-field">
                  <label className="sp-label">Space Name</label>
                  <input
                    className="sp-input"
                    type="text"
                    placeholder={displayName ? `${displayName}'s Space` : 'e.g. "Team Meetings"'}
                    value={newSpaceName}
                    onChange={e => setNewSpaceName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="sp-field">
                  <label className="sp-label">Select Space</label>
                  <div className="sp-select-wrap">
                    <select
                      className="sp-select"
                      value={selectedSpaceId}
                      onChange={e => setSelectedSpaceId(e.target.value)}
                    >
                      <option value="">Choose a space…</option>
                      {spaces.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="sp-select-icon" />
                  </div>
                </div>
              )}

              <div className="sp-hint">
                Future analyses matching this voice will be automatically added to the space.
              </div>
            </>
          )}
        </div>

        <div className="sp-footer">
          <button className="sp-cancel" onClick={onClose}>Cancel</button>
          <button
            className={`sp-save ${saved ? 'sp-save-done' : ''}`}
            onClick={handleSave}
            disabled={loading || !displayName.trim() || (tab === 'profile' && spaceMode === 'new' && !newSpaceName.trim() && !displayName.trim())}
          >
            {saved
              ? <><Check size={14} /> Saved</>
              : loading
                ? <><Loader2 size={14} className="sp-spin" /> Saving…</>
                : tab === 'profile' ? 'Save & Create Space' : 'Save Name'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpeakerPopup

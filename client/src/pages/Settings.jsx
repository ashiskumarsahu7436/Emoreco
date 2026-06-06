import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Settings.css'

const NAV_ITEMS = [
  {
    id: 'profile', label: 'Profile',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  },
  {
    id: 'analysis', label: 'Analysis Defaults',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  },
  {
    id: 'notifications', label: 'Notifications',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  },
  {
    id: 'privacy', label: 'Privacy & Security',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  },
  {
    id: 'billing', label: 'Billing',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
  },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={`toggle ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-thumb" />
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const [user, setUser] = useState({ name: '', email: '' })
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saved, setSaved] = useState(false)
  const [prefs, setPrefs] = useState({
    autoAnalyze: true,
    generateTranscript: true,
    saveRecordings: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    setUser(u)
    const parts = (u.name || '').split(' ')
    setFirstName(parts[0] || '')
    setLastName(parts.slice(1).join(' ') || '')
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const handleSave = () => {
    const fullName = `${firstName} ${lastName}`.trim()
    const updated = { ...user, name: fullName }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDeleteAccount = () => {
    if (!confirm('This will permanently delete your account and all analyses. This cannot be undone.')) return
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const initials = (user.name || 'JD').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="settings-page">
      {/* ── Top bar ── */}
      <div className="settings-topbar">
        <div>
          <h1>Settings</h1>
          <p>Manage your account, preferences, and analysis defaults.</p>
        </div>
        <button className="save-btn" onClick={handleSave}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-layout">
        {/* ── Sidebar ── */}
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`snav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <div className="settings-sidebar-footer">
            <button className="snav-item logout-item" onClick={handleLogout}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Log Out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="settings-main">

          {activeTab === 'profile' && (
            <>
              {/* Profile banner card */}
              <div className="profile-card">
                <div className="profile-banner" />
                <div className="profile-card-body">
                  <div className="profile-avatar-wrap">
                    <div className="profile-avatar">{initials}</div>
                  </div>
                  <div className="profile-identity">
                    <span className="profile-name">{user.name || 'Jordan Doe'}</span>
                    <span className="profile-email">{user.email || 'jordan.doe@emoreco.app'}</span>
                  </div>
                  <div className="profile-avatar-actions">
                    <button className="avatar-btn change-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                      Change
                    </button>
                    <button className="avatar-btn remove-btn">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="settings-section">
                <div className="ssection-header">
                  <h2>Personal Information</h2>
                  <p>Update your name and contact details.</p>
                </div>
                <div className="sform-grid">
                  <div className="sform-field">
                    <label>First name</label>
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="sform-field">
                    <label>Last name</label>
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                  <div className="sform-field">
                    <label>Email</label>
                    <div className="sform-input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <input type="email" value={user.email || ''} readOnly />
                    </div>
                  </div>
                  <div className="sform-field">
                    <label>Default language</label>
                    <div className="sform-input-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      <input type="text" defaultValue="English (US)" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Preferences */}
              <div className="settings-section">
                <div className="ssection-header">
                  <h2>Analysis Preferences</h2>
                  <p>Control how new recordings are processed.</p>
                </div>
                <div className="sprefs-list">
                  <div className="spref-row">
                    <div className="spref-icon blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                    <div className="spref-text">
                      <span className="spref-title">Auto-analyze new uploads</span>
                      <span className="spref-desc">Start emotion detection right after upload.</span>
                    </div>
                    <Toggle checked={prefs.autoAnalyze} onChange={v => setPrefs(p => ({ ...p, autoAnalyze: v }))} />
                  </div>
                  <div className="spref-row">
                    <div className="spref-icon indigo">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </div>
                    <div className="spref-text">
                      <span className="spref-title">Generate transcript</span>
                      <span className="spref-desc">Create a timestamped transcript per analysis.</span>
                    </div>
                    <Toggle checked={prefs.generateTranscript} onChange={v => setPrefs(p => ({ ...p, generateTranscript: v }))} />
                  </div>
                  <div className="spref-row">
                    <div className="spref-icon slate">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                      </svg>
                    </div>
                    <div className="spref-text">
                      <span className="spref-title">Save recordings to history</span>
                      <span className="spref-desc">Keep microphone recordings after analysis.</span>
                    </div>
                    <Toggle checked={prefs.saveRecordings} onChange={v => setPrefs(p => ({ ...p, saveRecordings: v }))} />
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="settings-section danger-zone">
                <div className="ssection-header">
                  <h2 className="danger-title">Danger Zone</h2>
                  <p>Permanently delete your account and all analyses.</p>
                </div>
                <div className="danger-row">
                  <span className="danger-warning">This action cannot be undone.</span>
                  <button className="delete-account-btn" onClick={handleDeleteAccount}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                    Delete Account
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab !== 'profile' && (
            <div className="settings-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/>
              </svg>
              <p>This section is coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

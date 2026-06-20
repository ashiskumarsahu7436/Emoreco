import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './light-theme.css'

const token = localStorage.getItem('token')
const saved = localStorage.getItem('theme')
// Only apply saved theme preference when the user is logged in.
// Landing, login, and signup pages are always dark.
document.documentElement.setAttribute('data-theme', (token && saved === 'light') ? 'light' : 'dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

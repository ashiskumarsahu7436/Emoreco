import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Spaces from './pages/Spaces'
import History from './pages/History'
import Analysis from './pages/Analysis'
import Login from './pages/Login'
import Signup from './pages/Signup'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/spaces" element={<Spaces />} />
            <Route path="/history" element={<History />} />
            <Route path="/analysis/:id" element={<Analysis />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App

import { AudioWaveform } from 'lucide-react'
import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">
          <span className="footer-logo-icon">
            <AudioWaveform size={16} color="white" strokeWidth={2} />
          </span>
          EMORECO
        </div>
        <p className="footer-copy">&copy; 2025 EMORECO. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer

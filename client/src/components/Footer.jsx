import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">
          <span className="footer-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2a2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 0 7 10.5v1A2.5 2.5 0 0 0 9.5 14"/>
              <path d="M14.5 2a2.5 2.5 0 0 0-2.5 2.5v1a2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 1 2.5 2.5v1a2.5 2.5 0 0 1-2.5 2.5"/>
              <path d="M12 14v4"/>
              <path d="M9.5 14a2.5 2.5 0 0 0 0 5H12"/>
              <path d="M14.5 14a2.5 2.5 0 0 1 0 5H12"/>
            </svg>
          </span>
          EMORECO
        </div>
        <p className="footer-copy">&copy; 2025 EMORECO. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer

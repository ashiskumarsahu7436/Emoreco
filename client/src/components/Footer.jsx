import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">
          <span className="footer-logo-icon">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M9 1.5C4.86 1.5 1.5 4.86 1.5 9s3.36 7.5 7.5 7.5 7.5-3.36 7.5-7.5S13.14 1.5 9 1.5zM7.5 12.75L3.75 9l1.058-1.058 2.692 2.685 5.692-5.692L14.25 6l-6.75 6.75z" fill="white"/>
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

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import './ThinkingBlock.css'

function ThinkingBlock({ thinking }) {
  const [open, setOpen] = useState(false)

  if (!thinking) return null

  return (
    <div className="tb-wrap">
      <button className="tb-header" onClick={() => setOpen(v => !v)}>
        <span className="tb-title">
          <span className="tb-brain">🧠</span>
          Thinking
        </span>
        <span className="tb-toggle">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          <span className="tb-hint">{open ? 'Hide reasoning' : 'Show AI reasoning'}</span>
        </span>
      </button>

      <div className={`tb-body ${open ? 'tb-body--open' : ''}`}>
        <div className="tb-content">
          <pre className="tb-text">{thinking}</pre>
        </div>
      </div>
    </div>
  )
}

export default ThinkingBlock

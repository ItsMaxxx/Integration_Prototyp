import { useState } from 'react'
import './InfoBox.css'

// Kleines "?" neben einem Begriff – zeigt die Erklärung bei Hover, Fokus oder Klick (Touch)
export default function InfoTipp({ text }) {
  const [offen, setOffen] = useState(false)
  return (
    <span className="infotipp" onMouseEnter={() => setOffen(true)} onMouseLeave={() => setOffen(false)}>
      <button
        type="button"
        className="infotipp__knopf"
        aria-label={text}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOffen(!offen) }}
        onFocus={() => setOffen(true)}
        onBlur={() => setOffen(false)}
      >
        ?
      </button>
      {offen && <span className="infotipp__text" role="tooltip">{text}</span>}
    </span>
  )
}

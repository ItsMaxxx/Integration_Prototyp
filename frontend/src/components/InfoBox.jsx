import { useState } from 'react'
import { Link } from 'react-router-dom'
import './InfoBox.css'

// Einklappbare Erklärung oben auf einer Seite. Der Zustand (auf/zu) wird je Seite im Browser gemerkt.
export default function InfoBox({ id, titel = 'So funktioniert diese Seite', hilfe, children }) {
  const schluessel = `proofm-infobox-${id}`
  const [offen, setOffen] = useState(() => {
    try {
      return localStorage.getItem(schluessel) !== 'zu'
    } catch {
      return true
    }
  })

  function umschalten() {
    const neu = !offen
    setOffen(neu)
    try {
      localStorage.setItem(schluessel, neu ? 'auf' : 'zu')
    } catch {
      // Ohne Speicher bleibt die Box eben nur bis zum Neuladen zu
    }
  }

  return (
    <section className={`infobox ${offen ? '' : 'infobox--zu'}`}>
      <button className="infobox__kopf" onClick={umschalten} aria-expanded={offen}>
        <span className="infobox__symbol">i</span>
        <span className="infobox__titel">{titel}</span>
        <span className="infobox__umschalter">{offen ? 'ausblenden' : 'einblenden'}</span>
      </button>
      {offen && (
        <div className="infobox__inhalt">
          {children}
          {hilfe && (
            <p className="infobox__mehr">
              <Link to={`/hilfe#${hilfe}`}>Mehr dazu in der Hilfe →</Link>
            </p>
          )}
        </div>
      )}
    </section>
  )
}

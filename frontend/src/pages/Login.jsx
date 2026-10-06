import { useState } from 'react'
import { api } from '../api'
import './Login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState('')
  const [laedt, setLaedt] = useState(false)

  async function absenden(e) {
    e.preventDefault()
    setFehler('')
    setLaedt(true)
    const antwort = await api('/api/login', { method: 'POST', body: { email, passwort } })
    setLaedt(false)
    if (antwort.success) onLogin()
    else setFehler(antwort.message || 'Login fehlgeschlagen.')
  }

  return (
    <div className="login">
      <form className="karte login__box" onSubmit={absenden}>
        <div className="login__logo">
          <span className="header__haken">✓</span> PROOFM
        </div>
        <p className="untertitel">Vom Leistungsverzeichnis zum lückenlosen Nachweis.</p>
        {fehler && <div className="meldung meldung--fehler">{fehler}</div>}
        <label>
          E-Mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </label>
        <label>
          Passwort
          <input type="password" value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
        </label>
        <button className="btn btn--primaer" disabled={laedt}>
          {laedt ? 'Anmelden …' : 'Anmelden'}
        </button>
        <p className="leise">Demo-Zugang steht in der .env (DEMO_EMAIL / DEMO_PASSWORT).</p>
      </form>
    </div>
  )
}

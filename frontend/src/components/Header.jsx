import { NavLink, useNavigate } from 'react-router-dom'
import { api } from '../api'
import './Header.css'

const NAV = [
  { to: '/', label: 'Übersicht', end: true },
  { to: '/eingang', label: 'Protokoll-Eingang' },
  { to: '/maengel', label: 'Mängel' },
  { to: '/nachunternehmer', label: 'Nachunternehmer' },
]

export default function Header({ session, onLogout }) {
  const navigate = useNavigate()

  async function logout() {
    await api('/api/logout', { method: 'POST' })
    await onLogout()
    navigate('/login')
  }

  return (
    <header className="header">
      <div className="header__inner">
        <NavLink to="/" className="header__logo">
          <span className="header__haken">✓</span> PROOFM
        </NavLink>
        <nav className="header__nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="header__rechts">
          <span className={`chip ${session.kiAktiv ? 'chip--gruen' : ''}`} title="KI-Unterstützung über Claude">
            {session.kiAktiv ? 'KI aktiv' : 'Regelbasiert'}
          </span>
          <span className="header__user">{session.user?.name}</span>
          <button className="btn btn--klein" onClick={logout}>Logout</button>
        </div>
      </div>
    </header>
  )
}

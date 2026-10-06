import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ObjektDetail from './pages/ObjektDetail'
import LvImport from './pages/LvImport'
import ProtokollEingang from './pages/ProtokollEingang'
import Maengel from './pages/Maengel'
import Nachunternehmer from './pages/Nachunternehmer'
import Portal from './pages/Portal'
import { api } from './api'

export default function App() {
  // null = Session wird noch geprüft
  const [session, setSession] = useState(null)

  const ladeSession = () => api('/api/session').then(setSession)
  useEffect(() => { ladeSession() }, [])

  if (session === null) return <div className="laden">Lade …</div>

  const geschuetzt = (element) => (session.loggedIn ? element : <Navigate to="/login" replace />)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session.loggedIn ? <Navigate to="/" replace /> : <Login onLogin={ladeSession} />} />
        {/* Nachunternehmer-Portal: ohne Login, ohne Navigation */}
        <Route path="/portal/:token" element={<Portal />} />
        <Route element={geschuetzt(<Layout session={session} onLogout={ladeSession} />)}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/objekte/:id" element={<ObjektDetail />} />
          <Route path="/objekte/:id/lv-import" element={<LvImport kiAktiv={session.kiAktiv} />} />
          <Route path="/eingang" element={<ProtokollEingang />} />
          <Route path="/maengel" element={<Maengel />} />
          <Route path="/nachunternehmer" element={<Nachunternehmer />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

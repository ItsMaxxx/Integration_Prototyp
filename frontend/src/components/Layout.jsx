import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function Layout({ session, onLogout }) {
  const { pathname, hash } = useLocation()

  // Bei jedem Seitenwechsel nach oben – sonst bleibt die Scrollposition der vorherigen (langen) Seite stehen.
  // Mit Sprungmarke (/hilfe#ablauf) scrollt die Zielseite selbst zum Abschnitt.
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Header session={session} onLogout={onLogout} />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

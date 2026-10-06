import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function Layout({ session, onLogout }) {
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

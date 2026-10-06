import { useEffect, useState } from 'react'
import { api } from '../api'

const LEER = { firma: '', ansprechpartner: '', email: '', telefon: '', konditionen: '' }

export default function Nachunternehmer() {
  const [liste, setListe] = useState(null)
  const [form, setForm] = useState(LEER)
  const [bearbeiteId, setBearbeiteId] = useState(null)
  const [fehler, setFehler] = useState('')

  const laden = () => api('/api/nachunternehmer').then((d) => setListe(d.nachunternehmer || []))
  useEffect(() => { laden() }, [])

  const setze = (feld) => (e) => setForm({ ...form, [feld]: e.target.value })

  async function speichern(e) {
    e.preventDefault()
    const antwort = bearbeiteId
      ? await api(`/api/nachunternehmer/${bearbeiteId}`, { method: 'PUT', body: form })
      : await api('/api/nachunternehmer', { method: 'POST', body: form })
    if (!antwort.success) return setFehler(antwort.message || 'Speichern fehlgeschlagen.')
    setFehler('')
    setForm(LEER)
    setBearbeiteId(null)
    laden()
  }

  async function loeschen(n) {
    if (!confirm(`${n.firma} löschen? Zugeordnete Positionen verlieren den Nachunternehmer.`)) return
    await api(`/api/nachunternehmer/${n.id}`, { method: 'DELETE' })
    laden()
  }

  return (
    <div className="seite">
      <div className="seite__kopf">
        <div>
          <h1>Nachunternehmer</h1>
          <p className="untertitel">Externe Fachfirmen für die Disposition „extern“. Der Upload-Zugang ist für sie lizenzfrei.</p>
        </div>
      </div>

      <form className="karte" onSubmit={speichern} style={{ marginBottom: '1rem' }}>
        <h2>{bearbeiteId ? 'Nachunternehmer bearbeiten' : 'Neuer Nachunternehmer'}</h2>
        {fehler && <div className="meldung meldung--fehler">{fehler}</div>}
        <div className="raster raster--4" style={{ marginBottom: '0.9rem' }}>
          <label>Firma*<input value={form.firma} onChange={setze('firma')} required /></label>
          <label>Ansprechpartner<input value={form.ansprechpartner || ''} onChange={setze('ansprechpartner')} /></label>
          <label>E-Mail<input type="email" value={form.email || ''} onChange={setze('email')} /></label>
          <label>Telefon<input value={form.telefon || ''} onChange={setze('telefon')} /></label>
        </div>
        <label style={{ marginBottom: '0.9rem' }}>Konditionen<input value={form.konditionen || ''} onChange={setze('konditionen')} /></label>
        <div className="zeile">
          <button className="btn btn--primaer">{bearbeiteId ? 'Speichern' : 'Hinzufügen'}</button>
          {bearbeiteId && <button type="button" className="btn" onClick={() => { setBearbeiteId(null); setForm(LEER) }}>Abbrechen</button>}
        </div>
      </form>

      <section className="karte">
        {!liste ? (
          <div className="laden">Lade …</div>
        ) : liste.length === 0 ? (
          <div className="leer">Noch keine Nachunternehmer.</div>
        ) : (
          <div className="tabelle-wrapper">
            <table>
              <thead>
                <tr><th>Firma</th><th>Ansprechpartner</th><th>Kontakt</th><th>Konditionen</th><th></th></tr>
              </thead>
              <tbody>
                {liste.map((n) => (
                  <tr key={n.id}>
                    <td><strong>{n.firma}</strong></td>
                    <td>{n.ansprechpartner || '–'}</td>
                    <td>
                      {n.email && <div><a href={`mailto:${n.email}`}>{n.email}</a></div>}
                      {n.telefon && <div className="leise">{n.telefon}</div>}
                    </td>
                    <td>{n.konditionen || '–'}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button className="btn btn--klein" onClick={() => { setBearbeiteId(n.id); setForm(n); window.scrollTo(0, 0) }}>Bearbeiten</button>{' '}
                      <button className="btn btn--klein btn--gefahr" onClick={() => loeschen(n)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

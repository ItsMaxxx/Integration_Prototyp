import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, datum } from '../api'
import Ampel from '../components/Ampel'
import Kennzahl from '../components/Kennzahl'
import './Dashboard.css'

export default function Dashboard() {
  const [daten, setDaten] = useState(null)
  const [neu, setNeu] = useState(false)

  const laden = () => api('/api/dashboard').then(setDaten)
  useEffect(() => { laden() }, [])

  if (!daten) return <div className="laden">Lade Übersicht …</div>

  const rot = daten.eskalationen.filter((e) => e.ampel === 'rot').length
  const gelb = daten.eskalationen.filter((e) => e.ampel === 'gelb').length
  const scores = daten.objekte.map((o) => o.kennzahlen.score)
  const portfolioScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100

  return (
    <div className="seite">
      <div className="seite__kopf">
        <div>
          <h1>Übersicht</h1>
          <p className="untertitel">Ist jede vertraglich geschuldete Wartung fristgerecht nachgewiesen?</p>
        </div>
        <button className="btn btn--primaer" onClick={() => setNeu(!neu)}>+ Objekt anlegen</button>
      </div>

      {neu && <NeuesObjekt onFertig={() => { setNeu(false); laden() }} />}

      <div className="raster raster--4 dashboard__kennzahlen">
        <Kennzahl
          titel="Compliance-Score"
          wert={portfolioScore}
          einheit="%"
          hinweis="Nachgewiesen ÷ fällige Termine, Ø aller Objekte"
          farbe={portfolioScore >= 95 ? 'gruen' : portfolioScore >= 80 ? 'gelb' : 'rot'}
        />
        <Kennzahl titel="Überfällig" wert={rot} hinweis="Pönale-Risiko – Nachweis fehlt" farbe={rot ? 'rot' : 'gruen'} />
        <Kennzahl titel="Frist in ≤ 4 Wochen" wert={gelb} hinweis="Vorwarnung vor Fristablauf" farbe={gelb ? 'gelb' : undefined} />
        <Kennzahl
          titel="Zu prüfen"
          wert={daten.northstar.pruefen}
          hinweis={<Link to="/eingang">Prüf-Warteschlange öffnen →</Link>}
        />
      </div>

      <div className="raster raster--2">
        <section className="karte">
          <h2>Objekte</h2>
          {daten.objekte.length === 0 && <div className="leer">Noch keine Objekte angelegt.</div>}
          <div className="objektliste">
            {daten.objekte.map((o) => (
              <Link key={o.id} to={`/objekte/${o.id}`} className="objektkarte">
                <div className="objektkarte__kopf">
                  <Ampel farbe={o.kennzahlen.ampel} nurPunkt />
                  <strong>{o.name}</strong>
                </div>
                <div className="leise">{o.auftraggeber || o.adresse || '–'}</div>
                <div className="scorebalken" title={`Compliance-Score ${o.kennzahlen.score} %`}>
                  <div
                    className={`scorebalken__fuellung scorebalken__fuellung--${o.kennzahlen.score >= 95 ? 'gruen' : o.kennzahlen.score >= 80 ? 'gelb' : 'rot'}`}
                    style={{ width: `${o.kennzahlen.score}%` }}
                  />
                </div>
                <div className="objektkarte__zahlen">
                  <span>{o.kennzahlen.score} %</span>
                  <span className="leise">
                    {o.kennzahlen.rot} überfällig · {o.kennzahlen.gelb} bald fällig · {o.kennzahlen.gesamt} Termine
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="karte">
          <h2>Northstar: automatisch zugeordnete Nachweise pro Woche</h2>
          <Wochenchart wochen={daten.northstar.wochen} />
          <p className="leise">
            Automatisierungsgrad:{' '}
            <strong>{daten.northstar.automatisierungsgrad === null ? '–' : `${daten.northstar.automatisierungsgrad} %`}</strong>{' '}
            der zugeordneten Protokolle ohne menschliches Zutun · Offene Mängel:{' '}
            <Link to="/maengel">{daten.offeneMaengel}</Link>
          </p>
        </section>
      </div>

      <section className="karte dashboard__eskalation">
        <h2>Eskalationen</h2>
        {daten.eskalationen.length === 0 ? (
          <div className="leer">Keine offenen Fristen in den nächsten vier Wochen. 🎉</div>
        ) : (
          <div className="tabelle-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Frist</th>
                  <th>Objekt</th>
                  <th>Pos.</th>
                  <th>Anlage / Leistung</th>
                  <th>Verantwortlich</th>
                </tr>
              </thead>
              <tbody>
                {daten.eskalationen.map((e) => (
                  <tr key={e.id}>
                    <td><Ampel farbe={e.ampel} text={e.rest_tage < 0 ? `${-e.rest_tage} Tage überfällig` : `noch ${e.rest_tage} Tage`} /></td>
                    <td>{datum(e.faellig_am)}</td>
                    <td><Link to={`/objekte/${e.objekt_id}`}>{e.objekt_name}</Link></td>
                    <td>{e.pos_nr || '–'}</td>
                    <td>
                      {e.anlage}
                      <div className="leise">{e.leistung}</div>
                    </td>
                    <td>{e.verantwortung === 'extern' ? e.nachunternehmer_firma || 'extern (ohne NU)' : e.kostenstelle || 'intern'}</td>
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

// Ein-Serien-Balkendiagramm der letzten 8 Kalenderwochen (fehlende Wochen = 0)
function Wochenchart({ wochen }) {
  const [hover, setHover] = useState(null)
  const daten = letzteWochen(8).map((w) => {
    const eintrag = wochen.find((x) => x.woche === w.schluessel)
    return { ...w, automatisch: eintrag?.automatisch || 0, gesamt: eintrag?.gesamt || 0 }
  })
  const max = Math.max(1, ...daten.map((d) => d.automatisch))

  return (
    <div className="wochenchart" role="img" aria-label="Automatisch zugeordnete Nachweise je Kalenderwoche">
      <div className="wochenchart__flaeche">
        {daten.map((d, i) => (
          <div
            key={d.schluessel}
            className="wochenchart__spalte"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {hover === i && (
              <div className="wochenchart__tooltip">
                <strong>Woche {d.kw}</strong>
                <div>{d.automatisch} automatisch</div>
                <div className="leise">{d.gesamt} Protokolle gesamt</div>
              </div>
            )}
            {i === daten.length - 1 && <div className="wochenchart__wert">{d.automatisch}</div>}
            <div
              className="wochenchart__balken"
              style={{ height: `${(d.automatisch / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="wochenchart__achse">
        {daten.map((d) => <span key={d.schluessel}>W{d.kw}</span>)}
      </div>
    </div>
  )
}

// Wochenschlüssel passend zu SQLite strftime('%Y-W%W') (Woche beginnt Montag, Woche 00 vor dem ersten Montag)
function letzteWochen(anzahl) {
  const ergebnis = []
  const heute = new Date()
  for (let i = anzahl - 1; i >= 0; i--) {
    const d = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() - i * 7)
    const jahresanfang = new Date(d.getFullYear(), 0, 1)
    const tagImJahr = Math.floor((d - jahresanfang) / 86400000)
    const wochentagJan1 = (jahresanfang.getDay() + 6) % 7
    const ersterMontag = (7 - wochentagJan1) % 7
    const woche = Math.floor((tagImJahr + 7 - ersterMontag) / 7)
    ergebnis.push({ schluessel: `${d.getFullYear()}-W${String(woche).padStart(2, '0')}`, kw: woche })
  }
  return ergebnis
}

function NeuesObjekt({ onFertig }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', adresse: '', auftraggeber: '', planStart: '' })
  const [fehler, setFehler] = useState('')
  const setze = (feld) => (e) => setForm({ ...form, [feld]: e.target.value })

  async function speichern(e) {
    e.preventDefault()
    const antwort = await api('/api/objekte', { method: 'POST', body: form })
    if (!antwort.success) return setFehler(antwort.message)
    onFertig()
    navigate(`/objekte/${antwort.id}/lv-import`)
  }

  return (
    <form className="karte neues-objekt" onSubmit={speichern}>
      <h2>Neues Objekt</h2>
      {fehler && <div className="meldung meldung--fehler">{fehler}</div>}
      <div className="neues-objekt__felder">
        <label>Name*<input value={form.name} onChange={setze('name')} required /></label>
        <label>Adresse<input value={form.adresse} onChange={setze('adresse')} /></label>
        <label>Auftraggeber<input value={form.auftraggeber} onChange={setze('auftraggeber')} /></label>
        <label>Beginn Wartungsjahr<input type="date" value={form.planStart} onChange={setze('planStart')} /></label>
      </div>
      <div className="zeile">
        <button className="btn btn--primaer">Anlegen & LV einlesen →</button>
        <span className="leise">Ohne Datum beginnt das Wartungsjahr am Ersten des aktuellen Monats.</span>
      </div>
    </form>
  )
}

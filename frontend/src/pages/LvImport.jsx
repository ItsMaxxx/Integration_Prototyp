import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, zyklusText } from '../api'
import UploadZone from '../components/UploadZone'
import './LvImport.css'

const ZYKLEN = [1, 2, 3, 6, 12, 24, 36, 60]

// Baustein 1: LV einlesen → Vorschau prüfen/korrigieren → übernehmen (erzeugt den Jahresplan)
export default function LvImport({ kiAktiv }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objekt, setObjekt] = useState(null)
  const [nachunternehmer, setNachunternehmer] = useState([])
  const [analyse, setAnalyse] = useState(null)
  const [positionen, setPositionen] = useState([])
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState('')

  useEffect(() => {
    api(`/api/objekte/${id}`).then((d) => setObjekt(d.objekt))
    api('/api/nachunternehmer').then((d) => setNachunternehmer(d.nachunternehmer || []))
  }, [id])

  async function hochladen([datei]) {
    setFehler('')
    setLaedt(true)
    const form = new FormData()
    form.append('datei', datei)
    const antwort = await api(`/api/objekte/${id}/lv`, { method: 'POST', form })
    setLaedt(false)
    if (!antwort.success) return setFehler(antwort.message)
    setAnalyse({ ...antwort, dateiname: datei.name })
    setPositionen(antwort.positionen.map((p, i) => ({ ...p, _id: i, uebernehmen: true })))
  }

  const aendern = (index, feld, wert) =>
    setPositionen(positionen.map((p, i) => (i === index ? { ...p, [feld]: wert } : p)))

  async function uebernehmen() {
    setLaedt(true)
    const auswahl = positionen
      .filter((p) => p.uebernehmen)
      .map((p) => ({ ...p, preis: p.preis === '' || p.preis === null ? null : Number(p.preis) }))
    const antwort = await api(`/api/objekte/${id}/lv/${analyse.lvDokumentId}/uebernehmen`, {
      method: 'POST',
      body: { positionen: auswahl },
    })
    setLaedt(false)
    if (!antwort.success) return setFehler(antwort.message)
    navigate(`/objekte/${id}`)
  }

  const anzahl = positionen.filter((p) => p.uebernehmen).length
  const unsicher = positionen.filter((p) => !p.zyklusErkannt).length

  return (
    <div className="seite">
      <div className="seite__kopf">
        <div>
          <Link to={`/objekte/${id}`} className="leise">← {objekt?.name || 'Objekt'}</Link>
          <h1>Leistungsverzeichnis einlesen</h1>
          <p className="untertitel">
            PDF, Excel (XLSX) oder CSV – Wartungspositionen werden {kiAktiv ? 'per KI (Claude) bzw. regelbasiert' : 'regelbasiert'} extrahiert.
          </p>
        </div>
      </div>

      {fehler && <div className="meldung meldung--fehler">{fehler}</div>}

      {!analyse && (
        <div className="karte">
          <UploadZone
            accept=".pdf,.xlsx,.csv,.txt"
            text={laedt ? 'LV wird gelesen …' : 'LV-Datei hierher ziehen oder klicken'}
            deaktiviert={laedt}
            onDateien={hochladen}
          />
          <p className="leise lv-import__tipp">
            Tipp: Beispiel-LVs liegen im Projektordner unter <code>samples/</code>. Tabellen brauchen Spalten wie
            „Pos.“, „Anlage“, „Leistung“, „Norm“, „Zyklus“, „Preis“.
          </p>
        </div>
      )}

      {analyse && (
        <div className="karte">
          <div className="zeile lv-import__kopf">
            <div>
              <h2>Vorschau: {analyse.dateiname}</h2>
              <p className="leise">
                {positionen.length} Positionen erkannt ({analyse.methode === 'claude' ? 'KI-Extraktion' : 'regelbasiert'}).
                Bitte prüfen und korrigieren – erst nach „Übernehmen“ wird der Jahresplan erzeugt.
              </p>
            </div>
          </div>
          {unsicher > 0 && (
            <div className="meldung meldung--info">
              Bei {unsicher} Position(en) wurde kein Zyklus erkannt – Standard „jährlich“ gesetzt (gelb markiert).
            </div>
          )}
          <div className="tabelle-wrapper">
            <table className="lv-tabelle">
              <thead>
                <tr>
                  <th></th>
                  <th>Pos.</th>
                  <th>Anlage</th>
                  <th>Leistung</th>
                  <th>Norm</th>
                  <th>Zyklus</th>
                  <th>Preis €</th>
                  <th>Disposition</th>
                </tr>
              </thead>
              <tbody>
                {positionen.map((p, i) => (
                  <tr key={p._id} className={p.uebernehmen ? '' : 'lv-tabelle__aus'}>
                    <td><input type="checkbox" checked={p.uebernehmen} onChange={(e) => aendern(i, 'uebernehmen', e.target.checked)} /></td>
                    <td><input value={p.posNr || ''} onChange={(e) => aendern(i, 'posNr', e.target.value)} className="lv-tabelle__schmal" /></td>
                    <td><input value={p.anlage} onChange={(e) => aendern(i, 'anlage', e.target.value)} /></td>
                    <td><input value={p.leistung || ''} onChange={(e) => aendern(i, 'leistung', e.target.value)} /></td>
                    <td><input value={p.norm || ''} onChange={(e) => aendern(i, 'norm', e.target.value)} /></td>
                    <td>
                      <select
                        className={p.zyklusErkannt ? '' : 'lv-tabelle__unsicher'}
                        value={p.zyklusMonate}
                        onChange={(e) => setPositionen(positionen.map((x, j) => (j === i ? { ...x, zyklusMonate: Number(e.target.value), zyklusErkannt: true } : x)))}
                      >
                        {[...new Set([...ZYKLEN, p.zyklusMonate])].sort((a, b) => a - b).map((z) => (
                          <option key={z} value={z}>{zyklusText(z)}</option>
                        ))}
                      </select>
                    </td>
                    <td><input value={p.preis ?? ''} onChange={(e) => aendern(i, 'preis', e.target.value)} className="lv-tabelle__schmal" /></td>
                    <td>
                      <select value={p.verantwortung} onChange={(e) => aendern(i, 'verantwortung', e.target.value)}>
                        <option value="intern">intern</option>
                        <option value="extern">extern</option>
                      </select>
                      {p.verantwortung === 'extern' && (
                        <select value={p.nachunternehmerId || ''} onChange={(e) => aendern(i, 'nachunternehmerId', Number(e.target.value) || null)}>
                          <option value="">– NU –</option>
                          {nachunternehmer.map((n) => <option key={n.id} value={n.id}>{n.firma}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="zeile lv-import__fuss">
            <button className="btn btn--primaer" onClick={uebernehmen} disabled={laedt || anzahl === 0}>
              {anzahl} Positionen übernehmen & Jahresplan erzeugen
            </button>
            <button className="btn" onClick={() => { setAnalyse(null); setPositionen([]) }}>Andere Datei</button>
          </div>
        </div>
      )}
    </div>
  )
}

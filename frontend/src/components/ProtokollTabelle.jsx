import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, datum } from '../api'
import ZuordnungChip from './ZuordnungChip'
import './ProtokollTabelle.css'

// Liste eingegangener Protokolle. Mit nurPruefen=true ist sie die Prüf-Warteschlange (Human-in-the-Loop).
export default function ProtokollTabelle({ objektId, nurPruefen = false, onAenderung, neuLadenSignal }) {
  const [protokolle, setProtokolle] = useState(null)
  const [meldung, setMeldung] = useState(null)

  const laden = () => {
    const parameter = new URLSearchParams()
    if (objektId) parameter.set('objektId', objektId)
    if (nurPruefen) parameter.set('zuordnung', 'pruefen')
    return api(`/api/protokolle?${parameter}`).then((d) => setProtokolle(d.protokolle || []))
  }
  useEffect(() => { laden() }, [objektId, nurPruefen, neuLadenSignal])

  async function aktion(pfad, methode = 'POST', body) {
    const antwort = await api(pfad, { method: methode, body })
    setMeldung(antwort.success ? null : antwort.message)
    await laden()
    onAenderung?.()
  }

  if (!protokolle) return <div className="laden">Lade Protokolle …</div>
  if (protokolle.length === 0) {
    return <div className="leer">{nurPruefen ? 'Nichts zu prüfen – alle Protokolle sind zugeordnet. ✓' : 'Noch keine Protokolle eingegangen.'}</div>
  }

  return (
    <>
      {meldung && <div className="meldung meldung--fehler">{meldung}</div>}
      <div className="tabelle-wrapper">
        <table className="protokolltabelle">
          <thead>
            <tr>
              <th>Eingang</th>
              <th>Datei</th>
              {!objektId && <th>Objekt</th>}
              <th>Zuordnung</th>
              <th>{nurPruefen ? 'Vorschläge' : 'Wartungsposition'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {protokolle.map((p) => (
              <tr key={p.id}>
                <td>
                  {datum(p.eingegangen_am)}
                  <div className="leise">{p.quelle === 'portal' ? `Portal${p.absender ? ` · ${p.absender}` : ''}` : 'intern'}</div>
                </td>
                <td>
                  <a href={`/api/protokolle/${p.id}/datei`} target="_blank" rel="noreferrer">{p.dateiname}</a>
                  <div className="leise">durchgeführt {datum(p.durchfuehrung_am)}</div>
                </td>
                {!objektId && <td><Link to={`/objekte/${p.objekt_id}`}>{p.objekt_name}</Link></td>}
                <td>
                  <ZuordnungChip zuordnung={p.zuordnung} />
                  {p.konfidenz !== null && p.zuordnung !== 'manuell' && (
                    <div className="leise">Konfidenz {Math.round(p.konfidenz * 100)} %{p.methode === 'claude' ? ' · KI' : ''}</div>
                  )}
                </td>
                <td>
                  {p.zuordnung === 'pruefen' ? (
                    <Vorschlaege protokoll={p} onWahl={(terminId) => aktion(`/api/protokolle/${p.id}/bestaetigen`, 'POST', { terminId })} />
                  ) : p.pos_nr || p.anlage ? (
                    <>
                      Pos. {p.pos_nr} {p.anlage}
                      <div className="leise">Frist {datum(p.faellig_am)}</div>
                    </>
                  ) : (
                    '–'
                  )}
                </td>
                <td className="protokolltabelle__aktionen">
                  {(p.zuordnung === 'auto' || p.zuordnung === 'manuell') && (
                    <button className="btn btn--klein" onClick={() => aktion(`/api/protokolle/${p.id}/aufheben`)} title="Zuordnung zurücknehmen">
                      Aufheben
                    </button>
                  )}
                  <button
                    className="btn btn--klein btn--gefahr"
                    title="Protokoll löschen"
                    onClick={() => confirm(`${p.dateiname} löschen?`) && aktion(`/api/protokolle/${p.id}`, 'DELETE')}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// Top-3-Vorschläge der Engine + freie Auswahl aus allen offenen Terminen des Objekts
function Vorschlaege({ protokoll, onWahl }) {
  const [alle, setAlle] = useState(null)
  const [auswahl, setAuswahl] = useState('')

  async function alleLaden() {
    const d = await api(`/api/objekte/${protokoll.objekt_id}`)
    setAlle((d.objekt?.termine || []).filter((t) => t.status === 'offen'))
  }

  return (
    <div className="vorschlaege">
      {protokoll.vorschlaege.length === 0 && <div className="leise">Keine passende Pflicht erkannt.</div>}
      {protokoll.vorschlaege.map((v) => (
        <button key={v.termin_id} className="vorschlag" onClick={() => onWahl(v.termin_id)} title="Diese Zuordnung bestätigen">
          <span className="vorschlag__score">{Math.round(v.score * 100)} %</span>
          <span>
            Pos. {v.pos_nr} {v.anlage}
            <span className="leise"> · Frist {datum(v.faellig_am)}</span>
          </span>
          <span className="vorschlag__ok">✓</span>
        </button>
      ))}
      {alle === null ? (
        <button className="btn btn--klein" onClick={alleLaden}>Andere Pflicht wählen …</button>
      ) : (
        <div className="zeile">
          <select value={auswahl} onChange={(e) => setAuswahl(e.target.value)}>
            <option value="">– offener Termin –</option>
            {alle.map((t) => (
              <option key={t.id} value={t.id}>
                {datum(t.faellig_am)} · Pos. {t.pos_nr} {t.anlage}
              </option>
            ))}
          </select>
          <button className="btn btn--klein btn--primaer" disabled={!auswahl} onClick={() => onWahl(Number(auswahl))}>Zuordnen</button>
        </div>
      )}
    </div>
  )
}

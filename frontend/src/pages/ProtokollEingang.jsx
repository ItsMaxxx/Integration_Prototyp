import { useEffect, useState } from 'react'
import { api, datum } from '../api'
import UploadZone from '../components/UploadZone'
import ProtokollTabelle from '../components/ProtokollTabelle'
import ZuordnungChip from '../components/ZuordnungChip'

// Baustein 4: zentraler Eingang + Prüf-Warteschlange (Human-in-the-Loop bei niedriger Konfidenz)
export default function ProtokollEingang() {
  const [objekte, setObjekte] = useState([])
  const [objektId, setObjektId] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [ergebnisse, setErgebnisse] = useState([])
  const [signal, setSignal] = useState(0)

  useEffect(() => {
    api('/api/objekte').then((d) => {
      setObjekte(d.objekte || [])
      if (d.objekte?.length) setObjektId(String(d.objekte[0].id))
    })
  }, [])

  async function hochladen(dateien) {
    setLaedt(true)
    const form = new FormData()
    dateien.forEach((d) => form.append('dateien', d))
    const antwort = await api(`/api/objekte/${objektId}/protokolle`, { method: 'POST', form })
    setLaedt(false)
    setErgebnisse(antwort.ergebnisse || [{ success: false, message: antwort.message }])
    setSignal((s) => s + 1)
  }

  return (
    <div className="seite">
      <div className="seite__kopf">
        <div>
          <h1>Protokoll-Eingang</h1>
          <p className="untertitel">Protokolle einspielen – PROOFM ordnet sie automatisch der Pflicht zu, die sie erfüllen.</p>
        </div>
      </div>

      <section className="karte" style={{ marginBottom: '1rem' }}>
        <div className="zeile" style={{ marginBottom: '0.75rem' }}>
          <label style={{ flexDirection: 'row', alignItems: 'center' }}>
            Objekt
            <select value={objektId} onChange={(e) => setObjektId(e.target.value)}>
              {objekte.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        </div>
        <UploadZone
          mehrere
          accept=".pdf,.txt,.png,.jpg,.jpeg"
          deaktiviert={laedt || !objektId}
          text={laedt ? 'Protokolle werden gelesen und zugeordnet …' : 'Wartungsprotokolle hierher ziehen oder klicken'}
          onDateien={hochladen}
        />
        {ergebnisse.length > 0 && (
          <ul className="upload-ergebnisse">
            {ergebnisse.map((e, i) =>
              e.success ? (
                <li key={i}>
                  <ZuordnungChip zuordnung={e.protokoll.zuordnung} /> <strong>{e.protokoll.dateiname}</strong>
                  {e.protokoll.zuordnung === 'auto'
                    ? ` → Pos. ${e.protokoll.pos_nr} ${e.protokoll.anlage} (Frist ${datum(e.protokoll.faellig_am)}) nachgewiesen`
                    : ' → unten in der Prüf-Warteschlange bestätigen'}
                  {e.maengel?.length > 0 && <> <span className="chip chip--rot">{e.maengel.length} Mangel/Mängel</span></>}
                </li>
              ) : (
                <li key={i} className="meldung--fehler">{e.message}</li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="karte" style={{ marginBottom: '1rem' }}>
        <h2>Prüf-Warteschlange</h2>
        <p className="leise">
          Protokolle, die nicht sicher zugeordnet werden konnten (Konfidenz &lt; 80 % oder mehrere gleich gute Kandidaten).
          Ein Klick auf einen Vorschlag bestätigt die Zuordnung.
        </p>
        <ProtokollTabelle nurPruefen neuLadenSignal={signal} onAenderung={() => setSignal((s) => s + 1)} />
      </section>

      <section className="karte">
        <h2>Alle Protokolle</h2>
        <ProtokollTabelle neuLadenSignal={signal} onAenderung={() => setSignal((s) => s + 1)} />
      </section>
    </div>
  )
}

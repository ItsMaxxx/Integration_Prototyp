import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, datum, euro, zyklusText } from '../api'
import Ampel from '../components/Ampel'
import Kennzahl from '../components/Kennzahl'
import UploadZone from '../components/UploadZone'
import ProtokollTabelle from '../components/ProtokollTabelle'
import ZuordnungChip from '../components/ZuordnungChip'
import InfoBox from '../components/InfoBox'
import InfoTipp from '../components/InfoTipp'
import './ObjektDetail.css'

const TABS = [
  ['plan', 'Jahresplan', 'Alle Wartungstermine der nächsten 12 Monate mit Ampel und Nachweis. Filter und Reihenfolge lassen sich oben einstellen.'],
  ['positionen', 'Positionen & Disposition', 'Die Wartungspflichten aus dem LV. Legen Sie je Position fest, ob sie intern (Kostenstelle) oder extern (Nachunternehmer) erledigt wird.'],
  ['protokolle', 'Protokolle', 'Alle eingegangenen Protokolle dieses Objekts, das neueste zuerst. „Aufheben“ nimmt eine falsche Zuordnung zurück.'],
  ['maengel', 'Mängel', 'Aus den Protokollen erkannte Defekte als Folgeaufgaben. Offene stehen oben.'],
]

export default function ObjektDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [objekt, setObjekt] = useState(null)
  const [tab, setTab] = useState('plan')
  const [fehler, setFehler] = useState('')

  const laden = () =>
    api(`/api/objekte/${id}`).then((d) => (d.success ? setObjekt(d.objekt) : setFehler(d.message)))
  useEffect(() => { laden() }, [id])

  if (fehler) return <div className="seite"><div className="meldung meldung--fehler">{fehler}</div></div>
  if (!objekt) return <div className="laden">Lade Objekt …</div>

  const k = objekt.kennzahlen
  const portalLink = `${location.origin}/portal/${objekt.portal_token}`

  async function loeschen() {
    if (!confirm(`Objekt "${objekt.name}" mit allen Positionen, Terminen und Protokollen löschen?`)) return
    await api(`/api/objekte/${id}`, { method: 'DELETE' })
    navigate('/')
  }

  return (
    <div className="seite">
      <div className="seite__kopf">
        <div>
          <Link to="/" className="leise">← Übersicht</Link>
          <h1>{objekt.name}</h1>
          <p className="untertitel">
            {[objekt.adresse, objekt.auftraggeber].filter(Boolean).join(' · ')} · Wartungsjahr ab {datum(objekt.plan_start)}
          </p>
        </div>
        <div className="zeile">
          <Link className="btn" to={`/objekte/${id}/lv-import`}>LV einlesen</Link>
          <button className="btn btn--gefahr" onClick={loeschen}>Löschen</button>
        </div>
      </div>

      <InfoBox id="objekt" hilfe="objekt">
        <p>Diese Seite zeigt alles zu einem Gebäude:</p>
        <ul>
          <li><strong>Kennzahlen:</strong> Wie viel ist nachgewiesen, was ist überfällig, was wird bald fällig.</li>
          <li><strong>Protokolle einspielen:</strong> Wartungsprotokolle hineinziehen. PROOFM erkennt automatisch, welchen Termin sie erfüllen, und färbt ihn grün.</li>
          <li><strong>Reiter unten:</strong> Jahresplan, Positionen aus dem LV, alle Protokolle und erkannte Mängel.</li>
          <li><strong>Nachunternehmer-Portal:</strong> Upload-Link für externe Firmen. Sie können damit ohne Konto Protokolle einreichen.</li>
        </ul>
        <p>Noch keine Termine? Oben rechts auf <strong>„LV einlesen“</strong> klicken.</p>
      </InfoBox>

      <div className="raster raster--4 objekt__kennzahlen">
        <Kennzahl titel="Compliance-Score" wert={k.score} einheit="%" farbe={k.score >= 95 ? 'gruen' : k.score >= 80 ? 'gelb' : 'rot'} hinweis={`${k.gruen} von ${k.gruen + k.rot} fälligen Terminen nachgewiesen`} info="Anteil der bis heute fälligen Wartungen dieses Objekts, für die ein Protokoll vorliegt. Grün ab 95 %, gelb ab 80 %." />
        <Kennzahl titel="Überfällig" wert={k.rot} farbe={k.rot ? 'rot' : 'gruen'} hinweis="Nachweis fehlt" info="Frist abgelaufen, aber kein Protokoll zugeordnet – Pönale-Risiko." />
        <Kennzahl titel="Frist in ≤ 4 Wochen" wert={k.gelb} farbe={k.gelb ? 'gelb' : undefined} hinweis={`${k.grau} weitere geplant`} info="Offene Termine, deren Frist in den nächsten 28 Tagen endet." />
        <div className="karte">
          <div className="kennzahl__titel">
            Nachunternehmer-Portal
            <InfoTipp text="Diesen Link an externe Firmen schicken. Sie können damit ohne Konto Protokolle für dieses Objekt hochladen, sehen aber keine Fristen oder Preise." />
          </div>
          <p className="leise">Upload-Link ohne Login – Protokolle laufen direkt in die Zuordnung.</p>
          <div className="zeile">
            <button className="btn btn--klein" onClick={() => navigator.clipboard?.writeText(portalLink)}>Link kopieren</button>
            <a className="btn btn--klein" href={portalLink} target="_blank" rel="noreferrer">Öffnen ↗</a>
          </div>
        </div>
      </div>

      <ProtokollUpload objektId={id} onFertig={laden} />

      <div className="tabs">
        {TABS.map(([schluessel, label, erklaerung]) => (
          <button key={schluessel} className={`tabs__tab ${tab === schluessel ? 'tabs__tab--aktiv' : ''}`} onClick={() => setTab(schluessel)} title={erklaerung}>
            {label}
          </button>
        ))}
      </div>

      <section className="karte">
        <p className="leise tabs__erklaerung">{TABS.find(([s]) => s === tab)[2]}</p>
        {tab === 'plan' && <Jahresplan termine={objekt.termine} />}
        {tab === 'positionen' && <Positionen objekt={objekt} onAenderung={laden} />}
        {tab === 'protokolle' && <ProtokollTabelle objektId={id} onAenderung={laden} />}
        {tab === 'maengel' && <MaengelListe objektId={id} />}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

function ProtokollUpload({ objektId, onFertig }) {
  const [laedt, setLaedt] = useState(false)
  const [ergebnisse, setErgebnisse] = useState([])

  async function hochladen(dateien) {
    setLaedt(true)
    const form = new FormData()
    dateien.forEach((d) => form.append('dateien', d))
    const antwort = await api(`/api/objekte/${objektId}/protokolle`, { method: 'POST', form })
    setLaedt(false)
    setErgebnisse(antwort.ergebnisse || [{ success: false, message: antwort.message }])
    onFertig()
  }

  return (
    <section className="karte objekt__upload">
      <h2>Protokolle einspielen</h2>
      <p className="leise">
        PDF, Text oder Foto eines Wartungsprotokolls hochladen. Sichere Treffer werden sofort als Nachweis verbucht, unsichere landen zur
        Bestätigung in der <Link to="/eingang">Prüf-Warteschlange</Link>.
      </p>
      <UploadZone
        mehrere
        accept=".pdf,.txt,.png,.jpg,.jpeg"
        text={laedt ? 'Protokolle werden gelesen und zugeordnet …' : 'Wartungsprotokolle hierher ziehen – PROOFM ordnet sie der passenden Pflicht zu'}
        deaktiviert={laedt}
        onDateien={hochladen}
      />
      {ergebnisse.length > 0 && (
        <ul className="upload-ergebnisse">
          {ergebnisse.map((e, i) =>
            e.success ? (
              <li key={i}>
                <ZuordnungChip zuordnung={e.protokoll.zuordnung} /> <strong>{e.protokoll.dateiname}</strong>
                {e.protokoll.zuordnung === 'auto' ? (
                  <> → Pos. {e.protokoll.pos_nr} {e.protokoll.anlage} (Frist {datum(e.protokoll.faellig_am)}) ist jetzt <span className="ampel--gruen">nachgewiesen</span></>
                ) : (
                  <> → bitte prüfen (<Link to="/eingang">Prüf-Warteschlange</Link>)</>
                )}
                {e.maengel?.length > 0 && <span className="chip chip--rot">{e.maengel.length} Mangel/Mängel erkannt</span>}
              </li>
            ) : (
              <li key={i} className="meldung--fehler">{e.message}</li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function Jahresplan({ termine }) {
  const [status, setStatus] = useState('')
  const [gewerk, setGewerk] = useState('')
  const [neuesteZuerst, setNeuesteZuerst] = useState(true)
  const gewerke = useMemo(() => [...new Set(termine.map((t) => t.gewerk).filter(Boolean))].sort(), [termine])

  // Backend liefert aufsteigend nach Frist; Standard ist die neueste Frist oben
  const gefiltert = termine.filter((t) => (!status || t.ampel === status) && (!gewerk || t.gewerk === gewerk))
  if (neuesteZuerst) gefiltert.reverse()

  // Nach Monat gruppieren
  const monate = []
  for (const t of gefiltert) {
    const schluessel = t.faellig_am.slice(0, 7)
    if (!monate.length || monate[monate.length - 1].schluessel !== schluessel) monate.push({ schluessel, termine: [] })
    monate[monate.length - 1].termine.push(t)
  }

  return (
    <>
      <div className="zeile filterleiste">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Alle Status</option>
          <option value="rot">überfällig</option>
          <option value="gelb">Frist naht</option>
          <option value="gruen">nachgewiesen</option>
          <option value="grau">geplant</option>
        </select>
        <select value={gewerk} onChange={(e) => setGewerk(e.target.value)}>
          <option value="">Alle Gewerke</option>
          {gewerke.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={neuesteZuerst ? 'neu' : 'alt'} onChange={(e) => setNeuesteZuerst(e.target.value === 'neu')} title="Reihenfolge nach Frist">
          <option value="neu">Neueste Frist zuerst</option>
          <option value="alt">Älteste Frist zuerst</option>
        </select>
        <span className="leise">{gefiltert.length} Termine</span>
      </div>
      {gefiltert.length === 0 ? (
        <div className="leer">Keine Termine. Lies zuerst ein Leistungsverzeichnis ein.</div>
      ) : (
        <div className="tabelle-wrapper">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Frist</th>
                <th>Pos.</th>
                <th>Anlage / Leistung</th>
                <th>Gewerk</th>
                <th>Verantwortlich</th>
                <th>Nachweis <InfoTipp text="Das zugeordnete Protokoll, das diese Wartung belegt. Klick öffnet die Datei." /></th>
              </tr>
            </thead>
            <tbody>
              {monate.map((m) => (
                <MonatsBlock key={m.schluessel} monat={m} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function MonatsBlock({ monat }) {
  const [j, mo] = monat.schluessel.split('-')
  const name = new Date(Number(j), Number(mo) - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  return (
    <>
      <tr className="monatszeile"><td colSpan={7}>{name}</td></tr>
      {monat.termine.map((t) => (
        <tr key={t.id}>
          <td><Ampel farbe={t.ampel} /></td>
          <td>{datum(t.faellig_am)}</td>
          <td>{t.pos_nr || '–'}</td>
          <td>
            {t.anlage}
            <div className="leise">{t.leistung}</div>
          </td>
          <td>{t.gewerk || '–'}</td>
          <td>{t.verantwortung === 'extern' ? t.nachunternehmer_firma || 'extern' : t.kostenstelle || 'intern'}</td>
          <td>
            {t.protokoll_id ? (
              <a href={`/api/protokolle/${t.protokoll_id}/datei`} target="_blank" rel="noreferrer">
                Protokoll vom {datum(t.nachgewiesen_am)}
              </a>
            ) : (
              <span className="leise">–</span>
            )}
          </td>
        </tr>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------

function Positionen({ objekt, onAenderung }) {
  const [nachunternehmer, setNachunternehmer] = useState([])
  useEffect(() => { api('/api/nachunternehmer').then((d) => setNachunternehmer(d.nachunternehmer || [])) }, [])

  async function speichern(position, aenderung) {
    const neu = { verantwortung: position.verantwortung, kostenstelle: position.kostenstelle, nachunternehmerId: position.nachunternehmer_id, ...aenderung }
    await api(`/api/positionen/${position.id}`, { method: 'PATCH', body: neu })
    onAenderung()
  }

  async function loeschen(position) {
    if (!confirm(`Position ${position.pos_nr || ''} ${position.anlage} inkl. Terminen löschen?`)) return
    await api(`/api/positionen/${position.id}`, { method: 'DELETE' })
    onAenderung()
  }

  if (objekt.positionen.length === 0) {
    return <div className="leer">Noch keine Positionen. <Link to={`/objekte/${objekt.id}/lv-import`}>LV einlesen →</Link></div>
  }

  return (
    <>
      <div className="tabelle-wrapper">
        <table>
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Anlage / Leistung</th>
              <th>Norm</th>
              <th>Zyklus <InfoTipp text="Wie oft die Wartung fällig ist. Daraus werden die Termine im Jahresplan berechnet." /></th>
              <th>Preis</th>
              <th>Disposition <InfoTipp text="Wer erledigt die Wartung? intern = eigenes Personal (Kostenstelle angeben), extern = Nachunternehmer (Firma auswählen)." /></th>
              <th>Kostenstelle / Nachunternehmer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {objekt.positionen.map((p) => (
              <tr key={p.id}>
                <td>{p.pos_nr || '–'}</td>
                <td>
                  {p.anlage}
                  <div className="leise">{p.leistung}</div>
                </td>
                <td>{p.norm || '–'}</td>
                <td>{zyklusText(p.zyklus_monate)}</td>
                <td>{euro(p.preis)}</td>
                <td>
                  <select value={p.verantwortung} onChange={(e) => speichern(p, { verantwortung: e.target.value })}>
                    <option value="intern">intern</option>
                    <option value="extern">extern</option>
                  </select>
                </td>
                <td>
                  {p.verantwortung === 'intern' ? (
                    <input
                      defaultValue={p.kostenstelle || ''}
                      placeholder="Kostenstelle"
                      onBlur={(e) => e.target.value !== (p.kostenstelle || '') && speichern(p, { kostenstelle: e.target.value })}
                    />
                  ) : (
                    <select value={p.nachunternehmer_id || ''} onChange={(e) => speichern(p, { nachunternehmerId: e.target.value })}>
                      <option value="">– Nachunternehmer wählen –</option>
                      {nachunternehmer.map((n) => <option key={n.id} value={n.id}>{n.firma}</option>)}
                    </select>
                  )}
                </td>
                <td><button className="btn btn--klein btn--gefahr" onClick={() => loeschen(p)} title="Position löschen">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {objekt.lvDokumente.length > 0 && (
        <div className="lv-dokumente">
          <h3>Eingelesene Leistungsverzeichnisse</h3>
          {objekt.lvDokumente.map((d) => (
            <div key={d.id} className="leise">
              {d.dateiname} · {d.anzahl_positionen} Positionen · {d.methode === 'claude' ? 'KI-Extraktion' : 'regelbasiert'} · {datum(d.importiert_am)}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------

export function MaengelListe({ objektId }) {
  const [maengel, setMaengel] = useState(null)
  const laden = () => api(objektId ? `/api/maengel?objektId=${objektId}` : '/api/maengel').then((d) => setMaengel(d.maengel || []))
  useEffect(() => { laden() }, [objektId])

  async function umschalten(m) {
    await api(`/api/maengel/${m.id}`, { method: 'PATCH', body: { status: m.status === 'offen' ? 'erledigt' : 'offen' } })
    laden()
  }

  if (!maengel) return <div className="laden">Lade …</div>
  if (maengel.length === 0) return <div className="leer">Keine Mängel aus Protokollen.</div>
  return (
    <div className="tabelle-wrapper">
      <table>
        <thead>
          <tr><th>Status</th><th>Mangel</th>{!objektId && <th>Objekt</th>}<th>Position</th><th>Quelle</th><th></th></tr>
        </thead>
        <tbody>
          {maengel.map((m) => (
            <tr key={m.id}>
              <td><span className={`chip ${m.status === 'offen' ? 'chip--rot' : 'chip--gruen'}`}>{m.status}</span></td>
              <td>{m.beschreibung}</td>
              {!objektId && <td><Link to={`/objekte/${m.objekt_id}`}>{m.objekt_name}</Link></td>}
              <td>{m.pos_nr ? `${m.pos_nr} ${m.anlage}` : '–'}</td>
              <td><a href={`/api/protokolle/${m.protokoll_id}/datei`} target="_blank" rel="noreferrer">{m.protokoll_datei}</a></td>
              <td><button className="btn btn--klein" onClick={() => umschalten(m)}>{m.status === 'offen' ? 'erledigt' : 'wieder öffnen'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

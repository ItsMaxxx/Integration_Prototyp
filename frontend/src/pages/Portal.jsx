import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import UploadZone from '../components/UploadZone'
import './Portal.css'

// Upload-Portal für Nachunternehmer: kein Login, kein Einblick in Fristen oder andere Protokolle
export default function Portal() {
  const { token } = useParams()
  const [objekt, setObjekt] = useState(undefined)
  const [absender, setAbsender] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [meldung, setMeldung] = useState(null)

  useEffect(() => {
    api(`/api/portal/${token}`).then((d) => setObjekt(d.success ? d.objekt : null))
  }, [token])

  async function hochladen(dateien) {
    setLaedt(true)
    const form = new FormData()
    form.append('absender', absender)
    dateien.forEach((d) => form.append('dateien', d))
    const antwort = await api(`/api/portal/${token}/upload`, { method: 'POST', form })
    setLaedt(false)
    setMeldung({ ok: antwort.success, text: antwort.message })
  }

  if (objekt === undefined) return <div className="laden">Lade …</div>

  return (
    <div className="portal">
      <div className="karte portal__box">
        <div className="portal__logo"><span className="portal__haken">✓</span> PROOFM · Protokoll-Upload</div>
        {objekt === null ? (
          <div className="meldung meldung--fehler">Dieser Upload-Link ist ungültig oder abgelaufen.</div>
        ) : (
          <>
            <h1>{objekt.name}</h1>
            <p className="untertitel">{objekt.adresse}</p>
            <p>
              Bitte laden Sie hier Ihre Wartungs- und Prüfprotokolle für dieses Objekt hoch. Die Zuordnung zur
              beauftragten Leistung erfolgt automatisch – ein Konto ist nicht nötig.
            </p>
            <label>
              Ihre Firma (optional)
              <input value={absender} onChange={(e) => setAbsender(e.target.value)} placeholder="z. B. Elektro Schwerer GmbH" />
            </label>
            {meldung && <div className={`meldung ${meldung.ok ? 'meldung--erfolg' : 'meldung--fehler'}`}>{meldung.text}</div>}
            <UploadZone
              mehrere
              accept=".pdf,.txt,.png,.jpg,.jpeg"
              deaktiviert={laedt}
              text={laedt ? 'Wird übermittelt …' : 'Protokolle hierher ziehen oder klicken'}
              onDateien={hochladen}
            />
          </>
        )}
      </div>
    </div>
  )
}

import { MaengelListe } from './ObjektDetail'

// Folgeaufgaben, die aus Protokollen extrahiert wurden – über alle Objekte
export default function Maengel() {
  return (
    <div className="seite">
      <div className="seite__kopf">
        <div>
          <h1>Mängel</h1>
          <p className="untertitel">Aus eingegangenen Protokollen automatisch extrahierte Folgeaufgaben.</p>
        </div>
      </div>
      <section className="karte">
        <MaengelListe />
      </section>
    </div>
  )
}

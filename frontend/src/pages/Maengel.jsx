import { MaengelListe } from './ObjektDetail'
import InfoBox from '../components/InfoBox'

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
      <InfoBox id="maengel" hilfe="maengel">
        <p>
          Meldet ein Wartungsprotokoll einen Defekt (z. B. „Antrieb tauschen“, „Batterie defekt“), legt PROOFM daraus
          automatisch eine <strong>Folgeaufgabe</strong> an. So geht kein Mangel in der Ablage verloren.
        </p>
        <ul>
          <li><strong>Offene Mängel stehen oben</strong>, innerhalb davon die neuesten zuerst.</li>
          <li>„erledigt“ hakt einen Mangel ab, „wieder öffnen“ holt ihn zurück.</li>
          <li>Über die Spalte „Quelle“ öffnet sich das Original-Protokoll.</li>
        </ul>
      </InfoBox>

      <section className="karte">
        <MaengelListe />
      </section>
    </div>
  )
}

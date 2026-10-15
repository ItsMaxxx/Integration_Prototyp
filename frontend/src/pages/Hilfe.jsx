import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Ampel from '../components/Ampel'
import ZuordnungChip from '../components/ZuordnungChip'
import './Hilfe.css'

const INHALT = [
  ['ueberblick', 'Worum geht es?'],
  ['ablauf', 'Der Ablauf in 5 Schritten'],
  ['uebersicht', 'Seite „Übersicht“'],
  ['objekt', 'Objekt-Seite'],
  ['lv-import', 'LV einlesen'],
  ['eingang', 'Protokoll-Eingang'],
  ['maengel', 'Mängel'],
  ['nachunternehmer', 'Nachunternehmer & Portal'],
  ['ampel', 'Ampel-Farben'],
  ['zuordnung', 'Wie werden Protokolle zugeordnet?'],
  ['begriffe', 'Begriffe von A bis Z'],
  ['faq', 'Häufige Fragen'],
]

export default function Hilfe() {
  const { hash } = useLocation()

  // Sprungmarken (/hilfe#eingang) nach dem Rendern anspringen
  // Wichtig: nichts zurückgeben – neuere Browser (Edge/Chrome ab ~150) liefern bei scrollTo ein Promise,
  // das React sonst beim Verlassen der Seite als Aufräumfunktion aufruft → Absturz, weiße Seite
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="seite hilfe">
      <div className="seite__kopf">
        <div>
          <h1>Hilfe</h1>
          <p className="untertitel">Was PROOFM macht, wie die Seiten zusammenhängen und was die Begriffe bedeuten.</p>
        </div>
      </div>

      <div className="hilfe__raster">
        <nav className="karte hilfe__inhalt" aria-label="Inhalt der Hilfe">
          <div className="kennzahl__titel">Inhalt</div>
          <ol>
            {INHALT.map(([anker, titel]) => (
              <li key={anker}><a href={`#${anker}`}>{titel}</a></li>
            ))}
          </ol>
        </nav>

        <div className="hilfe__text">
          <Abschnitt id="ueberblick" titel="Worum geht es?">
            <p>
              Im technischen Facility Management ist vertraglich festgelegt, welche Anlagen wie oft gewartet oder geprüft
              werden müssen, zum Beispiel die Brandmeldeanlage vierteljährlich und die Aufzüge jährlich. Diese Pflichten
              stehen im <strong>Leistungsverzeichnis (LV)</strong>. Wird eine Wartung nicht rechtzeitig <em>nachgewiesen</em>,
              drohen Vertragsstrafen (Pönalen) und Haftungsrisiken.
            </p>
            <p>PROOFM beantwortet deshalb eine Frage: <strong>Ist jede geschuldete Wartung fristgerecht nachgewiesen?</strong></p>
            <p>Dafür macht die Anwendung drei Dinge:</p>
            <ol>
              <li>Sie liest das LV ein und erzeugt daraus automatisch einen <strong>Jahresplan</strong> mit allen Terminen.</li>
              <li>Sie ordnet eingehende <strong>Wartungsprotokolle</strong> automatisch dem passenden Termin zu. Damit gilt der Termin als nachgewiesen.</li>
              <li>Sie zeigt mit einer <strong>Ampel</strong>, was erledigt ist, was bald fällig wird und was überfällig ist.</li>
            </ol>
          </Abschnitt>

          <Abschnitt id="ablauf" titel="Der Ablauf in 5 Schritten">
            <ol className="hilfe__schritte">
              <li>
                <strong>Objekt anlegen:</strong> Auf der <Link to="/">Übersicht</Link> auf „+ Objekt anlegen“ klicken, also
                das Gebäude oder die Liegenschaft anlegen.
              </li>
              <li>
                <strong>LV einlesen:</strong> Die LV-Datei (PDF, Excel oder CSV) hochladen. PROOFM schlägt die erkannten
                Wartungspositionen vor. Die Vorschau prüfen, bei Bedarf korrigieren und dann übernehmen. Erst dabei
                entsteht der Jahresplan.
              </li>
              <li>
                <strong>Verantwortung festlegen:</strong> Im Reiter „Positionen &amp; Disposition“ für jede Position
                festlegen, ob sie <em>intern</em> (eigenes Personal, mit Kostenstelle) oder <em>extern</em> (durch einen{' '}
                <Link to="/nachunternehmer">Nachunternehmer</Link>) erledigt wird.
              </li>
              <li>
                <strong>Protokolle einspielen:</strong> Nach jeder Wartung das Protokoll hochladen, entweder auf der
                Objekt-Seite, im <Link to="/eingang">Protokoll-Eingang</Link> oder durch den Nachunternehmer über seinen
                Upload-Link. PROOFM ordnet es automatisch zu.
              </li>
              <li>
                <strong>Im Blick behalten:</strong> Unsichere Zuordnungen in der Prüf-Warteschlange bestätigen,
                Eskalationen auf der Übersicht abarbeiten und erkannte <Link to="/maengel">Mängel</Link> erledigen.
              </li>
            </ol>
          </Abschnitt>

          <Abschnitt id="uebersicht" titel="Seite „Übersicht“">
            <p>Die Startseite fasst alle Objekte zusammen:</p>
            <ul>
              <li><strong>Kennzahlen oben:</strong> Compliance-Score, Anzahl überfälliger Termine, Termine mit naher Frist und Protokolle, die noch geprüft werden müssen.</li>
              <li><strong>Objekte:</strong> Jedes Objekt mit seinem eigenen Score als Balken. Ein Klick öffnet die Objekt-Seite.</li>
              <li>
                <strong>Northstar-Diagramm:</strong> Zeigt, wie viele Protokolle pro Kalenderwoche <em>ohne menschliches
                Zutun</em> zugeordnet wurden. Je höher, desto mehr Arbeit nimmt PROOFM ab.
              </li>
              <li>
                <strong>Eskalationen:</strong> Alle Termine, die überfällig sind oder in den nächsten 4 Wochen fällig
                werden. Die Liste ist nach Dringlichkeit sortiert, der am längsten überfällige Termin steht oben.
              </li>
            </ul>
          </Abschnitt>

          <Abschnitt id="objekt" titel="Objekt-Seite">
            <p>Hier sieht man alles zu einem Gebäude:</p>
            <ul>
              <li><strong>Kennzahlen</strong> wie auf der Übersicht, nur für dieses Objekt.</li>
              <li><strong>Nachunternehmer-Portal:</strong> Ein Upload-Link für externe Firmen, siehe <a href="#nachunternehmer">unten</a>.</li>
              <li><strong>Protokolle einspielen:</strong> Dateien hineinziehen. PROOFM ordnet sie sofort zu und zeigt das Ergebnis an.</li>
              <li>
                <strong>Reiter „Jahresplan“:</strong> Alle Termine des Wartungsjahres, nach Monat gruppiert, mit Ampel
                und dem Link zum Nachweis-Protokoll. Standardmäßig steht die späteste Frist oben. Die Reihenfolge lässt
                sich umschalten, außerdem kann nach Status und Gewerk gefiltert werden.
              </li>
              <li><strong>Reiter „Positionen &amp; Disposition“:</strong> Die übernommenen LV-Positionen. Hier wird festgelegt, wer zuständig ist.</li>
              <li><strong>Reiter „Protokolle“ / „Mängel“:</strong> Alle Protokolle und Mängel dieses Objekts, die neuesten oben.</li>
            </ul>
          </Abschnitt>

          <Abschnitt id="lv-import" titel="LV einlesen">
            <p>
              Erlaubt sind PDF, Excel (XLSX) und CSV. Tabellen werden am besten erkannt, wenn sie Spalten wie „Pos.“,
              „Anlage“, „Leistung“, „Norm“, „Zyklus“ und „Preis“ haben.
            </p>
            <ul>
              <li>Nach dem Hochladen erscheint eine <strong>Vorschau</strong>. Noch ist nichts gespeichert.</li>
              <li>Jedes Feld lässt sich direkt in der Tabelle korrigieren. Mit dem Häkchen links schließt man Positionen aus.</li>
              <li>
                <strong>Gelb markierter Zyklus:</strong> Hier wurde kein Wartungsintervall erkannt, deshalb ist „jährlich“
                eingetragen. Bitte prüfen.
              </li>
              <li>„Übernehmen &amp; Jahresplan erzeugen“ speichert die Positionen und legt Termine für 12 Monate an.</li>
            </ul>
          </Abschnitt>

          <Abschnitt id="eingang" titel="Protokoll-Eingang">
            <p>Der zentrale Briefkasten für Wartungsprotokolle aller Objekte:</p>
            <ol>
              <li>Oben das Objekt wählen und die Protokolle (PDF, Text oder Foto) hineinziehen.</li>
              <li>
                Jedes Protokoll bekommt einen Status:{' '}
                <ZuordnungChip zuordnung="auto" /> wurde sicher erkannt und ist erledigt,{' '}
                <ZuordnungChip zuordnung="pruefen" /> war unsicher und wartet auf eine Entscheidung,{' '}
                <ZuordnungChip zuordnung="manuell" /> wurde von einem Menschen bestätigt.
              </li>
              <li>
                <strong>Prüf-Warteschlange:</strong> Für unsichere Protokolle zeigt PROOFM bis zu drei Vorschläge mit
                Trefferquote. Ein Klick auf den richtigen Vorschlag bestätigt ihn. Passt keiner, wählt man über „Andere
                Pflicht wählen …“ einen beliebigen offenen Termin.
              </li>
              <li>
                <strong>Aufheben</strong> nimmt eine Zuordnung zurück. Der Termin ist dann wieder offen und das Protokoll
                landet in der Warteschlange. <strong>✕</strong> löscht das Protokoll.
              </li>
            </ol>
          </Abschnitt>

          <Abschnitt id="maengel" titel="Mängel">
            <p>
              Steht in einem Protokoll, dass etwas defekt ist oder repariert werden muss, legt PROOFM daraus automatisch
              eine <strong>Folgeaufgabe</strong> an. Offene Mängel stehen oben. Mit „erledigt“ hakt man sie ab, mit
              „wieder öffnen“ holt man sie zurück. Über die Quelle öffnet sich das Original-Protokoll.
            </p>
          </Abschnitt>

          <Abschnitt id="nachunternehmer" titel="Nachunternehmer & Portal">
            <p>
              Auf der Seite <Link to="/nachunternehmer">Nachunternehmer</Link> werden externe Fachfirmen gepflegt. Sie
              lassen sich danach Positionen mit Disposition „extern“ zuweisen.
            </p>
            <p>
              Jedes Objekt hat einen eigenen <strong>Upload-Link</strong> (Objekt-Seite → „Link kopieren“). Diesen Link
              schickt man der Firma. Sie kann damit <em>ohne Konto</em> ihre Protokolle hochladen, sieht aber keine
              Fristen, Preise oder anderen Daten. Hochgeladene Protokolle laufen genauso durch die automatische Zuordnung.
            </p>
          </Abschnitt>

          <Abschnitt id="ampel" titel="Ampel-Farben">
            <table className="hilfe__tabelle">
              <tbody>
                <tr><td><Ampel farbe="gruen" /></td><td>Ein Protokoll ist zugeordnet, die Pflicht ist erfüllt.</td></tr>
                <tr><td><Ampel farbe="gelb" /></td><td>Noch nicht nachgewiesen, die Frist endet in höchstens 4 Wochen.</td></tr>
                <tr><td><Ampel farbe="rot" /></td><td>Die Frist ist abgelaufen und es fehlt ein Nachweis. Hier droht eine Pönale.</td></tr>
                <tr><td><Ampel farbe="grau" /></td><td>Liegt mehr als 4 Wochen in der Zukunft, es ist noch nichts zu tun.</td></tr>
              </tbody>
            </table>
            <p className="leise">Die Frist eines Termins ist immer der letzte Tag des jeweiligen Monats.</p>
          </Abschnitt>

          <Abschnitt id="zuordnung" titel="Wie werden Protokolle zugeordnet?">
            <p>PROOFM liest den Text des Protokolls und vergleicht ihn mit jedem offenen Termin des Objekts. Punkte gibt es für:</p>
            <ul>
              <li>die <strong>LV-Positionsnummer</strong> (stärkstes Merkmal), z. B. „Pos. 2.2“,</li>
              <li>passende <strong>Anlagenbegriffe</strong> einschließlich Synonymen, z. B. „BMA“ = „Brandmeldeanlage“,</li>
              <li>den <strong>Ort</strong> bzw. Anlagenzusatz, z. B. „Treppenhaus Nord“,</li>
              <li>die genannte <strong>Norm</strong>, z. B. „DIN 14675“,</li>
              <li>die <strong>Nähe</strong> von Prüfdatum und Frist.</li>
            </ul>
            <p>
              Erreicht der beste Termin mindestens <strong>80 %</strong> und liegt er deutlich (15 Prozentpunkte) vor dem
              nächstbesten, wird automatisch zugeordnet. Sonst entscheidet ein Mensch in der Prüf-Warteschlange. So
              entstehen keine falschen Nachweise.
            </p>
            <p>
              Ist oben rechts <span className="chip chip--gruen">KI aktiv</span> zu sehen, liest zusätzlich die KI Claude
              die Dokumente, auch eingescannte PDFs und Fotos. Bei <span className="chip">Regelbasiert</span> arbeitet
              PROOFM nur mit festen Regeln. Die Anwendung funktioniert in beiden Fällen.
            </p>
          </Abschnitt>

          <Abschnitt id="begriffe" titel="Begriffe von A bis Z">
            <dl className="hilfe__begriffe">
              <dt>Automatisierungsgrad</dt>
              <dd>Anteil der zugeordneten Protokolle, die PROOFM ganz ohne menschliche Bestätigung zugeordnet hat.</dd>
              <dt>Compliance-Score</dt>
              <dd>
                Nachgewiesene Termine geteilt durch alle Termine, die bis heute fällig waren oder schon nachgewiesen
                sind. 100 % heißt: Nichts ist überfällig. Ab 95 % grün, ab 80 % gelb, darunter rot.
              </dd>
              <dt>Disposition</dt>
              <dd>Die Festlegung, wer eine Position erledigt: <em>intern</em> (eigenes Personal, Kostenstelle) oder <em>extern</em> (Nachunternehmer).</dd>
              <dt>Eskalation</dt>
              <dd>Ein Termin, der überfällig ist (rot) oder bald fällig wird (gelb).</dd>
              <dt>Frist</dt>
              <dd>Der Tag, bis zu dem eine Wartung nachgewiesen sein muss. Das ist immer das Monatsende.</dd>
              <dt>Gewerk</dt>
              <dd>Fachbereich einer Anlage, z. B. Elektro, Brandschutz, Heizung/Lüftung.</dd>
              <dt>Jahresplan</dt>
              <dd>Alle Wartungstermine eines Objekts für 12 Monate, automatisch aus den LV-Positionen und ihrem Zyklus berechnet.</dd>
              <dt>Konfidenz</dt>
              <dd>Wie sicher sich PROOFM bei einer Zuordnung ist, in Prozent. Ab 80 % wird automatisch zugeordnet.</dd>
              <dt>Leistungsverzeichnis (LV)</dt>
              <dd>Vertragsdokument, das alle geschuldeten Wartungs- und Prüfleistungen auflistet.</dd>
              <dt>Mangel</dt>
              <dd>Ein im Protokoll gemeldeter Defekt. PROOFM legt daraus automatisch eine Folgeaufgabe an.</dd>
              <dt>Nachunternehmer (NU)</dt>
              <dd>Externe Fachfirma, die Wartungen im Auftrag durchführt.</dd>
              <dt>Nachweis</dt>
              <dd>Ein Protokoll, das einem Termin zugeordnet ist. Erst damit gilt die Wartung als erbracht.</dd>
              <dt>Northstar</dt>
              <dd>Die zentrale Erfolgskennzahl des Produkts: automatisch zugeordnete Nachweise pro Woche.</dd>
              <dt>Norm</dt>
              <dd>Technische Regel, nach der geprüft wird, z. B. DIN 14675 für Brandmeldeanlagen.</dd>
              <dt>Pönale</dt>
              <dd>Vertragsstrafe, wenn eine geschuldete Leistung nicht fristgerecht erbracht bzw. nachgewiesen wird.</dd>
              <dt>Position</dt>
              <dd>Eine einzelne Zeile im LV: eine Anlage, eine Leistung und ein Zyklus.</dd>
              <dt>Prüf-Warteschlange</dt>
              <dd>Liste der Protokolle, bei denen PROOFM unsicher war und ein Mensch entscheiden muss.</dd>
              <dt>Protokoll</dt>
              <dd>Bericht über eine durchgeführte Wartung oder Prüfung.</dd>
              <dt>Zyklus</dt>
              <dd>Wie oft eine Wartung fällig ist, z. B. monatlich, vierteljährlich, jährlich.</dd>
            </dl>
          </Abschnitt>

          <Abschnitt id="faq" titel="Häufige Fragen">
            <Frage frage="Ein Protokoll wurde dem falschen Termin zugeordnet. Was tun?">
              Im Protokoll-Eingang (oder Objekt → Reiter „Protokolle“) beim Protokoll auf „Aufheben“ klicken. Es landet
              in der Prüf-Warteschlange. Dort den richtigen Termin wählen.
            </Frage>
            <Frage frage="Warum ist ein Termin rot, obwohl die Wartung gemacht wurde?">
              Rot bedeutet „kein Nachweis im System“. Wahrscheinlich wurde das Protokoll noch nicht hochgeladen oder es
              wartet in der Prüf-Warteschlange auf Bestätigung.
            </Frage>
            <Frage frage="Kann ich ein zweites LV für dasselbe Objekt einlesen?">
              Ja. Auf der Objekt-Seite auf „LV einlesen“ klicken. Die neuen Positionen kommen zu den bestehenden hinzu.
            </Frage>
            <Frage frage="Braucht der Nachunternehmer ein Konto?">
              Nein. Er bekommt den Upload-Link des Objekts und kann damit nur Protokolle hochladen.
            </Frage>
            <Frage frage="Wie blende ich die blauen Infoboxen aus?">
              Auf „ausblenden“ in der Kopfzeile der Box klicken. Der Browser merkt sich das, und mit „einblenden“ kommt sie zurück.
            </Frage>
          </Abschnitt>
        </div>
      </div>
    </div>
  )
}

function Abschnitt({ id, titel, children }) {
  return (
    <section id={id} className="karte hilfe__abschnitt">
      <h2>{titel}</h2>
      {children}
    </section>
  )
}

function Frage({ frage, children }) {
  return (
    <details className="hilfe__frage">
      <summary>{frage}</summary>
      <p>{children}</p>
    </details>
  )
}

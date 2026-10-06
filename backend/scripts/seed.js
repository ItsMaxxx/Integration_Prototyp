"use strict";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { styleText } from "node:util";
import db, * as q from "../model/database.js";
import { erzeugeTermine } from "../model/planModel.js";
import { vervollstaendige } from "../controller/lib/lvParser.js";
import { isoDatum, heuteIso } from "../controller/lib/plan.js";
import { NACHUNTERNEHMER, LV_POSITIONEN, LV_POSITIONEN_FILIALE, OFFEN_LASSEN } from "./demo-daten.js";

// Füllt eine leere Datenbank mit zwei Demo-Objekten inkl. Historie,
// damit Dashboard, Ampel und Northstar-Kennzahl sofort etwas zeigen.
export function seedDemo() {
  if (q.getAlleObjekte().length > 0) return false;

  const protokollOrdner = path.resolve(process.env.UPLOAD_DIR, "protokolle");
  fs.mkdirSync(protokollOrdner, { recursive: true });

  const nuIds = NACHUNTERNEHMER.map((nu) => q.insertNachunternehmer(nu));

  q.transaction(() => {
    anlegen({
      name: "Bürohaus Mainzer Landstraße",
      adresse: "Mainzer Landstraße 120, 60327 Frankfurt am Main",
      auftraggeber: "Bank AG – Corporate FM",
      monateZurueck: 8,
      positionen: LV_POSITIONEN,
      offenLassen: OFFEN_LASSEN,
      nuIds,
      protokollOrdner,
    });
    anlegen({
      name: "Filiale Wiesbaden Wilhelmstraße",
      adresse: "Wilhelmstraße 40, 65183 Wiesbaden",
      auftraggeber: "Bank AG – Corporate FM",
      monateZurueck: 4,
      positionen: LV_POSITIONEN_FILIALE,
      offenLassen: [],
      nuIds,
      protokollOrdner,
    });
  });

  console.log(styleText("green", "Demo-Daten (2 Objekte, Nachunternehmer, Protokoll-Historie) angelegt."));
  return true;
}

function anlegen({ name, adresse, auftraggeber, monateZurueck, positionen, offenLassen, nuIds, protokollOrdner }) {
  const d = new Date();
  const planStart = isoDatum(new Date(d.getFullYear(), d.getMonth() - monateZurueck, 1));
  const objektId = q.insertObjekt({
    name,
    adresse,
    auftraggeber,
    planStart,
    portalToken: crypto.randomBytes(16).toString("hex"),
  });

  const heute = heuteIso();
  let zaehler = 0;

  positionen.forEach((roh, index) => {
    const p = vervollstaendige(roh);
    const positionId = q.insertPosition({
      ...p,
      objektId,
      kostenstelle: roh.kostenstelle || null,
      nachunternehmerId: roh.nu !== undefined ? nuIds[roh.nu] : null,
    });
    erzeugeTermine(positionId, planStart, p.zyklusMonate, index);

    // Vergangene Termine nachweisen – bis auf den jeweils letzten bei "offenLassen"
    const vergangen = q
      .getTermineByObjekt(objektId)
      .filter((t) => t.position_id === positionId && t.faellig_am < heute);
    vergangen.forEach((termin, i) => {
      const istLetzter = i === vergangen.length - 1;
      if (istLetzter && offenLassen.includes(roh.posNr)) return;

      // Durchführung ein paar Tage vor der Frist, Eingang zwei Tage danach
      const durchgefuehrt = verschiebe(termin.faellig_am, -(3 + (zaehler % 9)));
      const eingegangen = verschiebe(durchgefuehrt, 2);
      const dateiname = `Protokoll_${roh.posNr}_${durchgefuehrt}.txt`;
      const pfad = path.join(protokollOrdner, `demo-${objektId}-${termin.id}.txt`);
      fs.writeFileSync(pfad, demoProtokoll(name, roh, durchgefuehrt), "utf8");

      const manuell = zaehler % 6 === 5; // ein Teil wurde per Hand bestätigt → realistischer Automatisierungsgrad
      const protokollId = db
        .prepare(
          `INSERT INTO protokolle (objekt_id, dateiname, pfad, mimetype, text, quelle, eingegangen_am, durchfuehrung_am,
                                   termin_id, konfidenz, zuordnung, methode)
           VALUES (?, ?, ?, 'text/plain', ?, ?, ?, ?, ?, ?, ?, 'regel')`,
        )
        .run(
          objektId,
          dateiname,
          pfad,
          demoProtokoll(name, roh, durchgefuehrt),
          roh.verantwortung === "extern" ? "portal" : "intern",
          `${eingegangen} 09:${String(10 + (zaehler % 50)).padStart(2, "0")}:00`,
          durchgefuehrt,
          termin.id,
          manuell ? 1 : 0.95,
          manuell ? "manuell" : "auto",
        ).lastInsertRowid;
      q.setTerminNachgewiesen(termin.id, protokollId, durchgefuehrt);

      if (roh.posNr === "2.2" && i === 0) {
        q.insertMangel(protokollId, positionId, "RWA-Klappe Treppenhaus 3. OG schließt nicht vollständig – Antrieb tauschen");
      }
      zaehler++;
    });
  });
}

function verschiebe(iso, tage) {
  const [j, m, t] = iso.split("-").map(Number);
  return isoDatum(new Date(j, m - 1, t + tage));
}

function demoProtokoll(objektName, p, datum) {
  const [j, m, t] = datum.split("-");
  return [
    `Wartungsprotokoll`,
    `Objekt: ${objektName}`,
    `LV-Pos. ${p.posNr} – ${p.anlage}`,
    `Leistung: ${p.leistung}`,
    `Grundlage: ${p.norm}`,
    `Prüfdatum: ${t}.${m}.${j}`,
    ``,
    `Ergebnis: Anlage betriebsbereit.`,
    `Mängel: keine`,
  ].join("\n");
}

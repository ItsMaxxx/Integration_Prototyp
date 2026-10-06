"use strict";

import { styleText } from "node:util";
import * as db from "./database.js";
import { extrahiereText } from "../controller/lib/textExtract.js";
import { analysiereText, ordneZu, findeMaengel, AUTO_SCHWELLE } from "../controller/lib/matcher.js";
import * as claude from "../controller/lib/claude.js";
import { heuteIso } from "../controller/lib/plan.js";

// Nachweis-Engine: Protokoll speichern → lesen → zuordnen → ggf. Termin auf "nachgewiesen" setzen
export async function verarbeite({ objektId, datei, quelle, absender }) {
  try {
    if (!db.getObjektById(objektId)) return { success: false, message: "Objekt nicht gefunden." };

    const text = await extrahiereText(datei.path);
    const protokollId = db.insertProtokoll({
      objektId,
      dateiname: datei.originalname,
      pfad: datei.path,
      mimetype: datei.mimetype,
      text,
      quelle,
      absender,
    });

    const offen = db.getOffeneTermineByObjekt(objektId);
    const analyse = analysiereText(text);
    const regel = ordneZu(analyse, offen);

    let ergebnis = { ...regel, durchfuehrungAm: analyse.datum, maengel: findeMaengel(text), methode: "regel" };

    // Claude ergänzt bzw. ersetzt die Regeln, wenn verfügbar (z. B. bei gescannten PDFs ohne Textebene)
    const ki = await claude.analysiereProtokoll({ dateipfad: datei.path, text, kandidaten: offen });
    if (ki) {
      const kiSicher = ki.termin_id !== null && ki.konfidenz >= AUTO_SCHWELLE;
      ergebnis = {
        terminId: ki.termin_id ?? regel.terminId,
        konfidenz: Math.round(ki.konfidenz * 100) / 100,
        zuordnung: kiSicher ? "auto" : "pruefen",
        vorschlaege: regel.vorschlaege,
        durchfuehrungAm: ki.durchfuehrung_am || analyse.datum,
        maengel: ki.maengel,
        methode: "claude",
      };
    }

    db.transaction(() => {
      db.updateProtokollZuordnung(protokollId, {
        terminId: ergebnis.terminId,
        konfidenz: ergebnis.konfidenz,
        zuordnung: ergebnis.zuordnung,
        vorschlaege: JSON.stringify(ergebnis.vorschlaege),
        durchfuehrungAm: ergebnis.durchfuehrungAm,
        methode: ergebnis.methode,
      });
      if (ergebnis.zuordnung === "auto") {
        db.setTerminNachgewiesen(ergebnis.terminId, protokollId, ergebnis.durchfuehrungAm || heuteIso());
      }
      const positionId = ergebnis.terminId ? db.getTerminById(ergebnis.terminId)?.position_id : null;
      for (const mangel of ergebnis.maengel) db.insertMangel(protokollId, positionId, mangel);
    });

    console.log(
      styleText(
        ergebnis.zuordnung === "auto" ? "green" : "yellow",
        `Protokoll ${datei.originalname}: ${ergebnis.zuordnung} (Konfidenz ${ergebnis.konfidenz}, ${ergebnis.methode})`,
      ),
    );

    return {
      success: true,
      protokoll: db.getProtokolle({ objektId }).find((p) => p.id === protokollId),
      maengel: ergebnis.maengel,
    };
  } catch (err) {
    console.error(styleText("red", "Fehler in protokollModel.verarbeite: " + err.message));
    return { success: false, message: "Protokoll konnte nicht verarbeitet werden: " + err.message };
  }
}

// Human-in-the-Loop: Objektleiter bestätigt oder korrigiert die Zuordnung
export function bestaetige(protokollId, terminId) {
  try {
    const protokoll = db.getProtokollById(protokollId);
    if (!protokoll) return { success: false, message: "Protokoll nicht gefunden." };
    const termin = db.getTerminById(terminId);
    if (!termin || termin.objekt_id !== protokoll.objekt_id) {
      return { success: false, message: "Termin gehört nicht zu diesem Objekt." };
    }
    if (termin.status === "nachgewiesen" && termin.protokoll_id !== protokollId) {
      return { success: false, message: "Dieser Termin ist bereits durch ein anderes Protokoll nachgewiesen." };
    }

    db.transaction(() => {
      // Falls vorher einem anderen Termin zugeordnet: dort den Nachweis zurücknehmen
      if (protokoll.termin_id && protokoll.termin_id !== terminId) {
        const alt = db.getTerminById(protokoll.termin_id);
        if (alt && alt.protokoll_id === protokollId) db.setTerminOffen(alt.id);
      }
      db.updateProtokollZuordnung(protokollId, {
        terminId,
        konfidenz: 1,
        zuordnung: "manuell",
        vorschlaege: protokoll.vorschlaege,
      });
      db.setTerminNachgewiesen(terminId, protokollId, protokoll.durchfuehrung_am || heuteIso());
      db.updateMangelPosition(protokollId, termin.position_id);
    });
    return { success: true, message: "Zuordnung bestätigt – Termin ist nachgewiesen." };
  } catch (err) {
    console.error(styleText("red", "Fehler in protokollModel.bestaetige: " + err.message));
    return { success: false, message: "Zuordnung konnte nicht gespeichert werden." };
  }
}

// Zuordnung zurücknehmen → Protokoll landet wieder in der Prüf-Warteschlange
export function aufheben(protokollId) {
  try {
    const protokoll = db.getProtokollById(protokollId);
    if (!protokoll) return { success: false, message: "Protokoll nicht gefunden." };
    db.transaction(() => {
      if (protokoll.termin_id) {
        const termin = db.getTerminById(protokoll.termin_id);
        if (termin && termin.protokoll_id === protokollId) db.setTerminOffen(termin.id);
      }
      db.updateProtokollZuordnung(protokollId, {
        terminId: null,
        konfidenz: protokoll.konfidenz,
        zuordnung: "pruefen",
        vorschlaege: protokoll.vorschlaege,
      });
    });
    return { success: true, message: "Zuordnung aufgehoben." };
  } catch (err) {
    console.error(styleText("red", "Fehler in protokollModel.aufheben: " + err.message));
    return { success: false, message: "Zuordnung konnte nicht aufgehoben werden." };
  }
}

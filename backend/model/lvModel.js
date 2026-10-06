"use strict";

import path from "path";
import { styleText } from "node:util";
import * as db from "./database.js";
import { erzeugeTermine } from "./planModel.js";
import { extrahiereText, leseTabelle } from "../controller/lib/textExtract.js";
import { parseTabelle, parseText, vervollstaendige } from "../controller/lib/lvParser.js";
import * as claude from "../controller/lib/claude.js";

// Schritt 1: LV einlesen und Positionen vorschlagen (noch nichts übernehmen)
export async function analysiere(objektId, datei) {
  try {
    if (!db.getObjektById(objektId)) return { success: false, message: "Objekt nicht gefunden." };

    const ext = path.extname(datei.path).toLowerCase();
    let positionen = [];
    let methode = "regel";

    // Tabellen sind strukturiert genug für die Regeln – Claude nur bei Fließtext/PDF
    const tabelle = await leseTabelle(datei.path);
    if (tabelle) positionen = parseTabelle(tabelle);

    if (positionen.length === 0) {
      const text = ext === ".xlsx" ? tabelle.map((z) => z.join(" ")).join("\n") : await extrahiereText(datei.path);
      const vonClaude = await claude.extrahiereLv({ dateipfad: datei.path, text });
      if (vonClaude && vonClaude.length > 0) {
        methode = "claude";
        positionen = vonClaude.map((p) =>
          vervollstaendige({
            posNr: p.pos_nr,
            anlage: p.anlage,
            gewerk: p.gewerk,
            leistung: p.leistung,
            norm: p.norm,
            zyklusMonate: p.zyklus_monate,
            preis: p.preis,
            verantwortung: p.verantwortung,
          }),
        );
      } else {
        positionen = parseText(text);
      }
    }

    if (positionen.length === 0) {
      return {
        success: false,
        message: "Keine Wartungspositionen erkannt. Erwartet werden Spalten wie Pos., Anlage, Leistung, Norm, Zyklus.",
      };
    }

    const lvDokumentId = db.insertLvDokument({
      objektId,
      dateiname: datei.originalname,
      pfad: datei.path,
      methode,
    });
    console.log(styleText("blue", `LV ${datei.originalname}: ${positionen.length} Positionen erkannt (${methode}).`));
    return { success: true, lvDokumentId, methode, positionen };
  } catch (err) {
    console.error(styleText("red", "Fehler in lvModel.analysiere: " + err.message));
    return { success: false, message: "Das LV konnte nicht gelesen werden: " + err.message };
  }
}

// Schritt 2: geprüfte Positionen übernehmen und Jahresplan erzeugen
export function uebernehmen(objektId, lvDokumentId, positionen) {
  try {
    const objekt = db.getObjektById(objektId);
    if (!objekt) return { success: false, message: "Objekt nicht gefunden." };
    if (!Array.isArray(positionen) || positionen.length === 0) {
      return { success: false, message: "Keine Positionen zum Übernehmen." };
    }

    let versatz = db.getPositionenByObjekt(objektId).length;
    let anzahlPositionen = 0;
    let anzahlTermine = 0;
    db.transaction(() => {
      for (const roh of positionen) {
        const p = vervollstaendige(roh);
        if (!p.anlage) continue;
        const positionId = db.insertPosition({
          ...p,
          objektId,
          lvDokumentId: lvDokumentId || null,
          kostenstelle: roh.kostenstelle || null,
          nachunternehmerId: roh.nachunternehmerId || null,
        });
        anzahlPositionen++;
        anzahlTermine += erzeugeTermine(positionId, objekt.plan_start, p.zyklusMonate, versatz++).length;
      }
    });
    return { success: true, message: `${anzahlPositionen} Positionen und ${anzahlTermine} Termine angelegt.` };
  } catch (err) {
    console.error(styleText("red", "Fehler in lvModel.uebernehmen: " + err.message));
    return { success: false, message: "Positionen konnten nicht übernommen werden." };
  }
}

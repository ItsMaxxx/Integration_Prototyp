"use strict";

// Erzeugt Beispieldateien in /samples:
//   - ein Leistungsverzeichnis als XLSX, CSV und PDF (für den LV-Import)
//   - Wartungsprotokolle, die genau die offenen Lücken des Demo-Objekts schließen
// Die Protokolldaten werden passend zum heutigen Datum berechnet (gleiche Logik wie der Seed).
// Aufruf: npm run samples

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { LV_POSITIONEN, NACHUNTERNEHMER } from "./demo-daten.js";
import { berechneFaelligkeiten, isoDatum, heuteIso } from "../controller/lib/plan.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ziel = path.resolve(__dirname, "../../samples");
fs.mkdirSync(ziel, { recursive: true });

const OBJEKT = "Bürohaus Mainzer Landstraße";
const euro = (n) => n.toLocaleString("de-DE", { minimumFractionDigits: 2 }) + " €";

// ---------------------------------------------------------------------------
// Leistungsverzeichnis
// ---------------------------------------------------------------------------

const KOPF = ["Pos.", "Anlage", "Gewerk", "Leistung", "Norm / Rechtsgrundlage", "Zyklus", "Preis (EUR)", "Ausführung"];
const zeilen = LV_POSITIONEN.map((p) => [
  p.posNr,
  p.anlage,
  p.gewerk,
  p.leistung,
  p.norm,
  p.zyklus,
  p.preis,
  p.verantwortung === "extern" ? "Nachunternehmer" : "Eigenleistung",
]);

async function lvXlsx() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Wartungsleistungen");
  ws.addRow(["Leistungsverzeichnis Technisches Gebäudemanagement – Bürohaus Mainzer Landstraße"]).font = { bold: true, size: 13 };
  ws.addRow([]);
  ws.addRow(KOPF).font = { bold: true };
  zeilen.forEach((z) => ws.addRow(z));
  ws.columns = [8, 38, 16, 46, 24, 16, 12, 18].map((width) => ({ width }));
  ws.getColumn(7).numFmt = "#,##0.00";
  await wb.xlsx.writeFile(path.join(ziel, "lv-beispiel.xlsx"));
}

function lvCsv() {
  const csv = [KOPF, ...zeilen.map((z) => z.map((w, i) => (i === 6 ? String(w).replace(".", ",") : w)))]
    .map((z) => z.map((w) => `"${String(w).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  fs.writeFileSync(path.join(ziel, "lv-beispiel.csv"), "﻿" + csv, "utf8");
}

function lvPdf() {
  return pdf("lv-beispiel.pdf", (doc) => {
    doc.fontSize(15).font("Helvetica-Bold").text("Leistungsverzeichnis – Wartung und Prüfung");
    doc.fontSize(10).font("Helvetica").text(`Objekt: ${OBJEKT}`).moveDown();
    doc.text("Vorbemerkung: Die nachstehenden Leistungen sind im angegebenen Turnus zu erbringen und durch ein Protokoll nachzuweisen.");
    doc.moveDown();
    for (const p of LV_POSITIONEN) {
      const wer = p.verantwortung === "extern" ? "Ausführung durch Fachfirma" : "Ausführung in Eigenleistung";
      doc.text(`${p.posNr} ${p.anlage} – ${p.leistung}; ${p.norm}; ${p.zyklus}; ${euro(p.preis)}; ${wer}`);
      doc.moveDown(0.4);
    }
  });
}

// ---------------------------------------------------------------------------
// Protokolle passend zum Demo-Objekt
// ---------------------------------------------------------------------------

// Gleiche Termin-Logik wie im Seed: Planstart = Monatserster vor 8 Monaten, Versatz = Index der Position
function letzteVergangeneFrist(posNr) {
  const d = new Date();
  const planStart = isoDatum(new Date(d.getFullYear(), d.getMonth() - 8, 1));
  const index = LV_POSITIONEN.findIndex((p) => p.posNr === posNr);
  const p = LV_POSITIONEN[index];
  const vergangen = berechneFaelligkeiten(planStart, p.zyklusMonate, index).filter((f) => f < heuteIso());
  return vergangen[vergangen.length - 1] || heuteIso();
}

function deutsch(iso, tageVerschiebung = 0) {
  const [j, m, t] = iso.split("-").map(Number);
  const d = new Date(j, m - 1, t + tageVerschiebung);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function protokollAufzug() {
  const p = LV_POSITIONEN.find((x) => x.posNr === "1.1");
  return pdf("protokoll-aufzug.pdf", (doc) => {
    doc.fontSize(16).font("Helvetica-Bold").text(NACHUNTERNEHMER[0].firma);
    doc.fontSize(9).font("Helvetica").text("Hanauer Landstraße 5 · 60314 Frankfurt").moveDown(1.5);
    doc.fontSize(14).font("Helvetica-Bold").text("Wartungsprotokoll Aufzugsanlage").moveDown();
    doc.fontSize(10).font("Helvetica");
    doc.text(`Objekt: ${OBJEKT}`);
    doc.text(`Anlage: ${p.anlage} (Fabrik-Nr. 4711-0815)`);
    doc.text(`Bezug: LV-Pos. ${p.posNr}`);
    doc.text(`Grundlage: ${p.norm}`);
    doc.text(`Wartungsdatum: ${deutsch(letzteVergangeneFrist("1.1"), -4)}`).moveDown();
    doc.text("Durchgeführte Arbeiten: Tragmittel und Bremse geprüft, Türantriebe justiert, Notruf getestet, Schmierung.");
    doc.moveDown();
    doc.text("Mängel: keine");
    doc.moveDown();
    doc.text("Ergebnis: Anlage betriebssicher.");
    doc.text("Techniker: M. Weber");
  });
}

function protokollBma() {
  const p = LV_POSITIONEN.find((x) => x.posNr === "2.1");
  return pdf("protokoll-bma-maengel.pdf", (doc) => {
    doc.fontSize(16).font("Helvetica-Bold").text(NACHUNTERNEHMER[1].firma).moveDown();
    doc.fontSize(14).text("Inspektions- und Wartungsbericht Brandmeldeanlage").moveDown();
    doc.fontSize(10).font("Helvetica");
    doc.text(`Liegenschaft: ${OBJEKT}`);
    doc.text(`Position: Pos. ${p.posNr} – BMA, Zentrale Typ FMZ 5000`);
    doc.text(`Prüfgrundlage: ${p.norm}`);
    doc.text(`Prüfdatum: ${deutsch(letzteVergangeneFrist("2.1"), -2)}`).moveDown();
    doc.text("Umfang: 1/4 der Melder ausgelöst, Hauptmelder, Übertragungseinrichtung und Feuerwehrschlüsseldepot geprüft.");
    doc.moveDown();
    doc.text("Festgestellte Mängel:");
    doc.text("- Rauchmelder Flur 2. OG (Gruppe 12/3) verschmutzt, Austausch erforderlich");
    doc.text("- Akku der Brandmelderzentrale älter als 4 Jahre, Tausch empfohlen");
    doc.moveDown();
    doc.text("Bemerkung: Anlage mit Einschränkungen betriebsbereit.");
  });
}

// Bewusst ohne Positionsnummer und Ortsangabe → passt auf RLT Nord UND Süd → Prüf-Warteschlange
function protokollRltMehrdeutig() {
  const text = [
    "Kurzbericht Lüftungswartung",
    `Objekt: ${OBJEKT}`,
    `Datum: ${deutsch(letzteVergangeneFrist("3.2"), -10)}`,
    "",
    "RLT-Anlage gewartet, Filter F7 gewechselt, Keilriemen geprüft, Hygienesichtprüfung nach VDI 6022 durchgeführt.",
    "",
    "Mängel: keine",
    "Techniker: Hausmeisterei / Team HLS",
  ].join("\n");
  fs.writeFileSync(path.join(ziel, "protokoll-rlt-mehrdeutig.txt"), text, "utf8");
}

// Kein Bezug zum Objekt → bleibt ohne Vorschlag in der Prüf-Warteschlange
function protokollUnbekannt() {
  const text = [
    "Prüfbericht Druckluftkompressor",
    "Prüfdatum: " + deutsch(heuteIso(), -1),
    "Kompressor Werkstatt geprüft, Sicherheitsventil in Ordnung.",
  ].join("\n");
  fs.writeFileSync(path.join(ziel, "protokoll-unbekannt.txt"), text, "utf8");
}

function pdf(dateiname, inhalt) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const stream = fs.createWriteStream(path.join(ziel, dateiname));
    doc.pipe(stream);
    inhalt(doc);
    doc.end();
    stream.on("finish", resolve);
  });
}

await lvXlsx();
lvCsv();
await lvPdf();
await protokollAufzug();
await protokollBma();
protokollRltMehrdeutig();
protokollUnbekannt();
console.log(`Beispieldateien in ${ziel} erzeugt.`);

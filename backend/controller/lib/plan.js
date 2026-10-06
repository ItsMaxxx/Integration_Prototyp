"use strict";

// Jahresplan, Ampel und Kennzahlen.
// Die Ampel wird nie gespeichert, sondern immer aus Status + Fälligkeit + heutigem Datum berechnet.

export const VORWARNUNG_TAGE = 28; // "Vier Wochen vor Fristablauf sieht Frau K. eine Ampel"

export function heuteIso() {
  return isoDatum(new Date());
}

export function isoDatum(datum) {
  const d = new Date(datum);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseIso(iso) {
  const [j, m, t] = iso.slice(0, 10).split("-").map(Number);
  return new Date(j, m - 1, t);
}

export function tageZwischen(vonIso, bisIso) {
  return Math.round((parseIso(bisIso) - parseIso(vonIso)) / 86400000);
}

// Letzter Tag des Monats (planStart + monate) = Frist
function monatsende(startIso, monate) {
  const start = parseIso(startIso);
  return isoDatum(new Date(start.getFullYear(), start.getMonth() + monate + 1, 0));
}

// Fälligkeiten einer Position für 12 Monate ab Planstart.
// Damit nicht alle Jahreswartungen im selben Monat liegen, wird je Position ein Versatz verwendet.
export function berechneFaelligkeiten(planStart, zyklusMonate, versatz = 0) {
  const zyklus = Math.max(1, zyklusMonate || 12);
  const fenster = Math.min(zyklus, 12);
  const offset = versatz % fenster;
  const termine = [];
  for (let monat = offset; monat < 12; monat += zyklus) {
    termine.push(monatsende(planStart, monat));
  }
  return termine;
}

export function ampel(termin, heute = heuteIso()) {
  if (termin.status === "nachgewiesen") return "gruen";
  const rest = tageZwischen(heute, termin.faellig_am);
  if (rest < 0) return "rot";
  if (rest <= VORWARNUNG_TAGE) return "gelb";
  return "grau";
}

export function mitAmpel(termine, heute = heuteIso()) {
  return termine.map((t) => ({ ...t, ampel: ampel(t, heute), rest_tage: tageZwischen(heute, t.faellig_am) }));
}

// Compliance-Score = nachgewiesen / (bis heute fällig ∪ bereits nachgewiesen)
export function kennzahlen(termine, heute = heuteIso()) {
  const zaehler = { gruen: 0, gelb: 0, rot: 0, grau: 0 };
  let relevant = 0;
  let nachgewiesen = 0;
  for (const t of termine) {
    const farbe = ampel(t, heute);
    zaehler[farbe]++;
    if (t.status === "nachgewiesen") {
      nachgewiesen++;
      relevant++;
    } else if (farbe === "rot") {
      relevant++;
    }
  }
  const score = relevant === 0 ? 100 : Math.round((nachgewiesen / relevant) * 100);
  let gesamtAmpel = "gruen";
  if (zaehler.rot > 0) gesamtAmpel = "rot";
  else if (zaehler.gelb > 0) gesamtAmpel = "gelb";
  return { ...zaehler, gesamt: termine.length, score, ampel: gesamtAmpel };
}

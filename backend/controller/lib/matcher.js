"use strict";

import { findeGruppen, findeOrtszusaetze, findeNormen, normalisiere, ORTSZUSAETZE } from "./fachbegriffe.js";
import { tageZwischen, heuteIso } from "./plan.js";

// Regelbasierte Nachweis-Engine: ordnet ein Protokoll dem passenden offenen Termin zu.
//
// Bewertung je Termin (0–1):
//   Positionsnummer im Protokoll  +0,55
//   Anlagen-Begriffsgruppe        +0,30 (anteilig)
//   Ortszusatz (Nord/Süd/Haus A)  +0,10 bzw. −0,15 bei Widerspruch
//   Norm im Protokoll             +0,10
//   Nähe Durchführung ↔ Frist     bis +0,15
//
// Ab AUTO_SCHWELLE und mit genügend Abstand zur nächstbesten *anderen* Position
// wird automatisch zugeordnet – sonst landet das Protokoll in der Prüf-Warteschlange.

export const AUTO_SCHWELLE = 0.8;
const MIN_ABSTAND = 0.15;

export function analysiereText(text) {
  const roh = String(text || "");
  return {
    datum: findeDurchfuehrungsdatum(roh),
    posNrs: findePositionsnummern(roh),
    gruppen: findeGruppen(roh),
    orte: findeOrtszusaetze(roh),
    normen: findeNormen(roh).map((n) => normalisiere(n).replace(/\s/g, "")),
  };
}

function findeDurchfuehrungsdatum(text) {
  const datumRe = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/;
  // Bevorzugt Datum hinter typischen Bezeichnern
  const bezeichner =
    /(prüfdatum|prüfung am|wartungsdatum|wartung am|durchgeführt am|datum der (prüfung|wartung|durchführung)|ausführungsdatum|inspektion am|datum)\s*:?\s*/i;
  const zeilen = text.split(/\r?\n/);
  for (const zeile of zeilen) {
    const m = zeile.match(bezeichner);
    if (m) {
      const d = zeile.slice(m.index).match(datumRe);
      if (d) return zuIso(d);
    }
  }
  const erstes = text.match(datumRe);
  return erstes ? zuIso(erstes) : null;
}

function zuIso(m) {
  let jahr = parseInt(m[3], 10);
  if (jahr < 100) jahr += 2000;
  const monat = parseInt(m[2], 10);
  const tag = parseInt(m[1], 10);
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

function findePositionsnummern(text) {
  const treffer = new Set();
  const re = /(?:LV[-\s]?)?pos(?:ition)?\.?\s*(?:nr\.?)?\s*[:#]?\s*(\d{1,3}(?:\.\d{1,3}){1,3})/gi;
  let m;
  while ((m = re.exec(text)) !== null) treffer.add(m[1]);
  return [...treffer];
}

// Bewertet alle offenen Termine eines Objekts und liefert Entscheidung + Top-3
export function ordneZu(analyse, offeneTermine) {
  const referenz = analyse.datum || heuteIso();
  const bewertet = offeneTermine.map((termin) => ({ termin, score: bewerte(analyse, termin, referenz) }));

  // Pro Position nur den Termin behalten, dessen Frist am besten passt
  const bestJePosition = new Map();
  for (const b of bewertet) {
    const bisher = bestJePosition.get(b.termin.position_id);
    if (!bisher || b.score > bisher.score) bestJePosition.set(b.termin.position_id, b);
  }
  const rangliste = [...bestJePosition.values()].sort((a, b) => b.score - a.score);

  // Nur ernsthafte Kandidaten vorschlagen – reine Datumsnähe reicht nicht
  const vorschlaege = rangliste.filter((r) => r.score >= 0.25).slice(0, 3).map(({ termin, score }) => ({
    termin_id: termin.id,
    score: Math.round(score * 100) / 100,
    pos_nr: termin.pos_nr,
    anlage: termin.anlage,
    leistung: termin.leistung,
    faellig_am: termin.faellig_am,
  }));

  const beste = rangliste[0];
  const zweite = rangliste[1];
  if (!beste || beste.score < 0.25) {
    return { terminId: null, konfidenz: beste ? round(beste.score) : 0, zuordnung: "pruefen", vorschlaege };
  }
  const abstand = beste.score - (zweite ? zweite.score : 0);
  const sicher = beste.score >= AUTO_SCHWELLE && abstand >= MIN_ABSTAND;
  return {
    terminId: beste.termin.id,
    konfidenz: round(beste.score),
    zuordnung: sicher ? "auto" : "pruefen",
    vorschlaege,
  };
}

function bewerte(analyse, termin, referenzDatum) {
  let score = 0;

  if (termin.pos_nr && analyse.posNrs.includes(termin.pos_nr)) score += 0.55;

  const gruppen = String(termin.stichworte || "")
    .split(",")
    .filter(Boolean);
  const anlagenGruppen = gruppen.filter((g) => !ORTSZUSAETZE.includes(g));
  const ortGruppen = gruppen.filter((g) => !anlagenGruppen.includes(g));

  if (anlagenGruppen.length > 0) {
    const treffer = anlagenGruppen.filter((g) => analyse.gruppen.includes(g)).length;
    score += 0.3 * (treffer / anlagenGruppen.length);
  }

  if (ortGruppen.length > 0 && analyse.orte.length > 0) {
    const passt = ortGruppen.some((o) => analyse.orte.includes(o));
    score += passt ? 0.1 : -0.15;
  }

  if (termin.norm && analyse.normen.length > 0) {
    const normTermin = normalisiere(termin.norm).replace(/\s/g, "");
    if (analyse.normen.some((n) => normTermin.includes(n) || n.includes(normTermin))) score += 0.1;
  }

  // Zeitliche Nähe: innerhalb eines halben Zyklus um die Frist volle Punkte, danach abnehmend
  const abstandTage = Math.abs(tageZwischen(referenzDatum, termin.faellig_am));
  const fenster = Math.max(31, ((termin.zyklus_monate || 12) * 30) / 2);
  score += 0.15 * Math.max(0, 1 - abstandTage / (fenster * 2));

  return Math.max(0, Math.min(1, score));
}

// Mängel aus dem Protokolltext: Abschnitt "Mängel:" bzw. Zeilen mit typischen Signalwörtern
export function findeMaengel(text) {
  const zeilen = String(text || "")
    .split(/\r?\n/)
    .map((z) => z.trim());
  const maengel = [];
  let imAbschnitt = false;

  for (const zeile of zeilen) {
    if (/^(festgestellte\s+)?m(ä|ae)ngel(liste)?\s*:?/i.test(zeile)) {
      imAbschnitt = true;
      const rest = zeile.replace(/^(festgestellte\s+)?m(ä|ae)ngel(liste)?\s*:?\s*/i, "");
      if (rest) pruefeUndFuegeHinzu(rest, maengel);
      continue;
    }
    if (imAbschnitt) {
      if (!zeile || /^(bemerkung|ergebnis|unterschrift|prüfer|techniker|fazit|nächste)/i.test(zeile)) {
        imAbschnitt = false;
        continue;
      }
      pruefeUndFuegeHinzu(zeile, maengel);
    } else if (/nicht in ordnung|defekt|ausgefallen|auszutauschen|instandsetzung erforderlich|mangel:/i.test(zeile)) {
      pruefeUndFuegeHinzu(zeile, maengel);
    }
  }
  return [...new Set(maengel)];
}

function pruefeUndFuegeHinzu(zeile, liste) {
  const text = zeile.replace(/^[-•*\d.)\s]+/, "").trim();
  if (text.length < 4) return;
  if (/^(keine|keine mängel|ohne befund|o\.\s?b\.|entfällt|-)\.?$/i.test(text)) return;
  if (/keine (mängel|beanstandungen)/i.test(text)) return;
  liste.push(text);
}

function round(x) {
  return Math.round(x * 100) / 100;
}

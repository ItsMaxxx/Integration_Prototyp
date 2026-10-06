"use strict";

import { findeNormen, zyklusInMonate, erzeugeStichworte, normalisiere } from "./fachbegriffe.js";

// Regelbasierte LV-Extraktion.
// Ergebnis ist immer eine Liste von Positions-Vorschlägen, die der Objektleiter vor dem Übernehmen prüft.

// Spaltenerkennung über typische Überschriften in Leistungsverzeichnissen
const SPALTEN = {
  posNr: /^(pos|position|pos\.?\s*nr|nr|oz|ordnungszahl|lfd)/i,
  anlage: /anlage|bauteil|gegenstand|objekt|bezeichnung/i,
  gewerk: /gewerk|kategorie|bereich/i,
  leistung: /leistung|beschreibung|tätigkeit|taetigkeit|langtext|kurztext|text/i,
  norm: /norm|vorschrift|rechtsgrundlage|grundlage|regelwerk/i,
  zyklus: /zyklus|intervall|turnus|häufigkeit|haeufigkeit|frequenz|rhythmus/i,
  preis: /preis|ep\b|betrag|€|eur|kosten|vergütung/i,
  verantwortung: /verantwort|ausführung|durchführung|intern\/extern|eigen|fremd/i,
};

export function parseTabelle(zeilen) {
  if (!zeilen || zeilen.length === 0) return [];

  // Kopfzeile = erste Zeile, in der mindestens Anlage/Leistung + Zyklus erkannt werden
  let kopfIndex = -1;
  let zuordnung = {};
  for (let i = 0; i < Math.min(zeilen.length, 15); i++) {
    const kandidat = erkenneSpalten(zeilen[i]);
    if ((kandidat.anlage !== undefined || kandidat.leistung !== undefined) && kandidat.zyklus !== undefined) {
      kopfIndex = i;
      zuordnung = kandidat;
      break;
    }
  }
  if (kopfIndex === -1) return [];

  const positionen = [];
  for (const zeile of zeilen.slice(kopfIndex + 1)) {
    const wert = (feld) => (zuordnung[feld] !== undefined ? (zeile[zuordnung[feld]] ?? "").trim() : "");
    const anlage = wert("anlage") || wert("leistung");
    if (!anlage) continue;

    const leistung = zuordnung.anlage !== undefined ? wert("leistung") : "";
    const zyklusMonate = zyklusInMonate(wert("zyklus"));
    const norm = wert("norm") || findeNormen(`${anlage} ${leistung}`).join(", ");

    positionen.push(
      vervollstaendige({
        posNr: wert("posNr") || null,
        anlage,
        gewerk: wert("gewerk") || null,
        leistung: leistung || null,
        norm: norm || null,
        zyklusMonate,
        preis: parsePreis(wert("preis")),
        verantwortung: parseVerantwortung(wert("verantwortung")),
      }),
    );
  }
  return positionen;
}

function erkenneSpalten(zeile) {
  const zuordnung = {};
  zeile.forEach((zelle, index) => {
    const text = String(zelle || "").trim();
    if (!text || text.length > 40) return;
    for (const [feld, re] of Object.entries(SPALTEN)) {
      if (zuordnung[feld] === undefined && re.test(text)) {
        zuordnung[feld] = index;
        break;
      }
    }
  });
  return zuordnung;
}

// Fließtext (z. B. aus PDF): Zeilen, die mit einer Ordnungszahl beginnen, werden zu Positionen.
// Folgezeilen ohne Ordnungszahl werden an die vorherige Position angehängt.
export function parseText(text) {
  const zeilen = String(text || "")
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean);

  const bloecke = [];
  for (const zeile of zeilen) {
    const m = zeile.match(/^(\d{1,3}(?:\.\d{1,3}){1,3})\.?\s+(.+)$/);
    if (m) bloecke.push({ posNr: m[1], text: m[2] });
    else if (bloecke.length > 0 && bloecke[bloecke.length - 1].text.length < 400) {
      bloecke[bloecke.length - 1].text += " " + zeile;
    }
  }

  const positionen = [];
  for (const block of bloecke) {
    const zyklusMonate = zyklusInMonate(block.text);
    // Ohne erkennbaren Zyklus ist es vermutlich keine Wartungsposition (z. B. Überschrift)
    if (!zyklusMonate) continue;

    const normen = findeNormen(block.text);
    // Anlage = Text bis zum ersten Trenner (–, ;, :, " - ") bzw. bis zur Norm/Zyklusangabe
    let anlage = block.text.split(/\s[–-]\s|;|:|\|/)[0].trim();
    if (anlage.length > 80) anlage = anlage.slice(0, 80).trim() + "…";

    positionen.push(
      vervollstaendige({
        posNr: block.posNr,
        anlage,
        gewerk: null,
        // Leistung = Text nach der Anlage bis zur nächsten Angabe (Norm, Zyklus, Preis folgen meist nach ";")
        leistung: block.text.slice(anlage.length).replace(/^[\s–\-;:|]+/, "").split(";")[0].trim() || null,
        norm: normen.join(", ") || null,
        zyklusMonate,
        preis: parsePreis(block.text.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*(?:€|EUR)/i)?.[1]),
        verantwortung: parseVerantwortung(block.text),
      }),
    );
  }
  return positionen;
}

// Gemeinsame Nachbearbeitung: Standardwerte, Gewerk raten, Stichworte erzeugen
export function vervollstaendige(p) {
  const position = {
    posNr: p.posNr ?? null,
    anlage: String(p.anlage || "").trim(),
    gewerk: p.gewerk || rateGewerk(`${p.anlage} ${p.leistung || ""} ${p.norm || ""}`),
    leistung: p.leistung ?? null,
    norm: p.norm ?? null,
    zyklusMonate: p.zyklusMonate || 12,
    zyklusErkannt: Boolean(p.zyklusMonate),
    preis: p.preis ?? null,
    verantwortung: p.verantwortung === "extern" ? "extern" : "intern",
  };
  position.stichworte = erzeugeStichworte(position.anlage, position.gewerk, position.leistung);
  return position;
}

function parsePreis(wert) {
  if (wert === undefined || wert === null || wert === "") return null;
  if (typeof wert === "number") return wert;
  // Deutsches Format: 1.234,56
  const bereinigt = String(wert).replace(/[^\d,.-]/g, "");
  const zahl = bereinigt.includes(",") ? parseFloat(bereinigt.replace(/\./g, "").replace(",", ".")) : parseFloat(bereinigt);
  return Number.isFinite(zahl) ? zahl : null;
}

function parseVerantwortung(wert) {
  const t = normalisiere(wert);
  if (/extern|nachunternehmer|\bnu\b|fremd|fachfirma|sachverständig|züs/.test(t)) return "extern";
  return "intern";
}

const GEWERKE = [
  [/aufzug|fahrstuhl|fördertechnik/i, "Fördertechnik"],
  [/brand|rwa|rauch|sprinkler|löscher|feststell|14675|0833/i, "Brandschutz"],
  [/lüftung|rlt|klima|kälte|6022/i, "Lüftung/Klima"],
  [/heizung|kessel|brenner|wärme/i, "Heizung"],
  [/trinkwasser|legionell|sanitär|abwasser|hebeanlage|abscheider|trinkwv/i, "Sanitär"],
  [/elektr|blitz|beleuchtung|notstrom|nea|usv|dguv|vde|betriebsmittel/i, "Elektro"],
  [/tor|schranke|tür/i, "Tore/Türen"],
];

function rateGewerk(text) {
  for (const [re, gewerk] of GEWERKE) if (re.test(text)) return gewerk;
  return null;
}

"use strict";

// Fachvokabular des technischen FM.
// Jede Gruppe fasst Synonyme/Abkürzungen zusammen, damit "BMA" im Protokoll
// auch zur LV-Position "Brandmeldeanlage" passt.

export const BEGRIFFSGRUPPEN = [
  { schluessel: "aufzug", begriffe: ["aufzug", "aufzüge", "aufzugsanlage", "personenaufzug", "lastenaufzug", "fahrstuhl", "fördertechnik"] },
  { schluessel: "bma", begriffe: ["bma", "brandmeldeanlage", "brandmelder", "rauchmelder", "brandmeldezentrale"] },
  { schluessel: "rwa", begriffe: ["rwa", "rauch- und wärmeabzug", "rauchabzug", "wärmeabzug", "entrauchung"] },
  { schluessel: "sprinkler", begriffe: ["sprinkler", "sprinkleranlage", "löschanlage"] },
  { schluessel: "feuerloescher", begriffe: ["feuerlöscher", "handfeuerlöscher", "löscher"] },
  { schluessel: "sicherheitsbeleuchtung", begriffe: ["sicherheitsbeleuchtung", "notbeleuchtung", "fluchtwegbeleuchtung", "notlicht"] },
  { schluessel: "rlt", begriffe: ["rlt", "rlt-anlage", "lüftung", "lüftungsanlage", "raumlufttechnik", "klimaanlage", "lüftungsgerät"] },
  { schluessel: "heizung", begriffe: ["heizung", "heizungsanlage", "kessel", "brennwertkessel", "brenner", "wärmeerzeuger"] },
  { schluessel: "trinkwasser", begriffe: ["trinkwasser", "trinkwasseranlage", "legionellen", "legionellenuntersuchung", "warmwasser"] },
  { schluessel: "blitzschutz", begriffe: ["blitzschutz", "blitzschutzanlage", "erdungsanlage"] },
  { schluessel: "dguv3", begriffe: ["ortsveränderlich", "ortsveränderliche", "betriebsmittel", "dguv v3", "dguv vorschrift 3", "e-check"] },
  { schluessel: "nea", begriffe: ["nea", "netzersatzanlage", "notstrom", "notstromaggregat", "notstromanlage", "aggregat"] },
  { schluessel: "usv", begriffe: ["usv", "unterbrechungsfreie stromversorgung"] },
  { schluessel: "tor", begriffe: ["rolltor", "tor", "toranlage", "sektionaltor", "schranke"] },
  { schluessel: "kaelte", begriffe: ["kälte", "kälteanlage", "kaltwassersatz", "split-gerät"] },
  { schluessel: "hebeanlage", begriffe: ["hebeanlage", "abwasserhebeanlage", "pumpensumpf"] },
  { schluessel: "fettabscheider", begriffe: ["fettabscheider", "abscheider", "ölabscheider"] },
  { schluessel: "feststellanlage", begriffe: ["feststellanlage", "brandschutztür", "brandschutztüren", "rauchschutztür"] },
  { schluessel: "druckbehaelter", begriffe: ["druckbehälter", "ausdehnungsgefäß"] },
];

// Unterscheidende Zusätze (z. B. Nord/Süd, Haus A/B) – helfen, gleichartige Anlagen auseinanderzuhalten
export const ORTSZUSAETZE = [
  "nord", "süd", "ost", "west", "haus a", "haus b", "haus c", "bauteil a", "bauteil b",
  "eg", "ug", "og", "tiefgarage", "dach", "keller", "haupttreppenhaus", "nebentreppenhaus",
];

// Liefert die Schlüssel aller Begriffsgruppen, die in einem Text vorkommen
export function findeGruppen(text) {
  const t = ` ${normalisiere(text)} `;
  const treffer = new Set();
  for (const gruppe of BEGRIFFSGRUPPEN) {
    for (const begriff of gruppe.begriffe) {
      // Wortanfang prüfen, damit "tor" nicht in "motor" trifft
      const re = new RegExp(`(^|[^a-zäöüß])${escapeRegex(begriff)}`, "i");
      if (re.test(t)) {
        treffer.add(gruppe.schluessel);
        break;
      }
    }
  }
  return [...treffer];
}

export function findeOrtszusaetze(text) {
  const t = ` ${normalisiere(text)} `;
  return ORTSZUSAETZE.filter((z) => new RegExp(`[^a-zäöüß]${escapeRegex(z)}[^a-zäöüß]`).test(t));
}

// Normen/Rechtsgrundlagen erkennen (DIN, VDE, DGUV, BetrSichV, VDI, TrinkwV …)
const NORM_REGEX =
  /\b(DIN(?:\s?EN)?(?:\s?ISO)?\s?\d{2,5}(?:[-–]\d+)*|VDE\s?\d{4}(?:[-–]\d+)*|DGUV\s?(?:Vorschrift|Regel|Information|V)?\s?\d+(?:[.-]\d+)*|BetrSichV(?:\s?§\s?\d+)?|TrinkwV(?:\s?§\s?\d+)?|VDI\s?\d{4}|ASR\s?A\d(?:\.\d+)?|VdS\s?\d+|ArbStättV|PrüfVO|GEG)/gi;

export function findeNormen(text) {
  if (!text) return [];
  const treffer = text.match(NORM_REGEX) || [];
  return [...new Set(treffer.map((n) => n.replace(/\s+/g, " ").trim()))];
}

// Zyklus-Angabe → Monate (null, wenn nichts erkannt wurde)
export function zyklusInMonate(wert) {
  if (wert === undefined || wert === null || wert === "") return null;
  if (typeof wert === "number") return wert > 0 ? Math.round(wert) : null;
  const t = normalisiere(String(wert));

  const tabelle = [
    [/wöchentlich|woechentlich/, 1], // Prototyp: kleinste Planungseinheit ist ein Monat
    [/monatlich|1\s*x?\s*(im|pro|je)\s*monat|jeden monat/, 1],
    [/zweimonatlich|alle\s*2\s*monate/, 2],
    [/viertel\s*jährlich|vierteljährlich|quartal|alle\s*3\s*monate|4\s*x?\s*(im|pro|je)\s*jahr/, 3],
    [/halb\s*jährlich|halbjährlich|alle\s*6\s*monate|2\s*x?\s*(im|pro|je)\s*jahr/, 6],
    [/(zwei|2)[\s-]*jährlich|alle\s*(2|zwei)\s*jahre/, 24],
    [/(drei|3)[\s-]*jährlich|alle\s*(3|drei)\s*jahre/, 36],
    [/(vier|4)[\s-]*jährlich|alle\s*(4|vier)\s*jahre/, 48],
    [/(fünf|5)[\s-]*jährlich|alle\s*(5|fünf)\s*jahre/, 60],
    [/jährlich|1\s*x?\s*(im|pro|je)\s*jahr|einmal\s*(im|pro)\s*jahr/, 12],
  ];
  for (const [re, monate] of tabelle) if (re.test(t)) return monate;

  // "6 Monate", "12 M", "24"
  const monate = t.match(/(\d+)\s*(monate|monat|mon|m)\b/);
  if (monate) return parseInt(monate[1], 10);
  const jahre = t.match(/(\d+)\s*(jahre|jahr|j)\b/);
  if (jahre) return parseInt(jahre[1], 10) * 12;
  if (/^\d+$/.test(t.trim())) return parseInt(t, 10);
  return null;
}

// Stichworte für das Matching: Begriffsgruppen + Ortszusätze
export function erzeugeStichworte(...texte) {
  const gesamt = texte.filter(Boolean).join(" ");
  return [...findeGruppen(gesamt), ...findeOrtszusaetze(gesamt)].join(",");
}

export function normalisiere(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

"use strict";

// Gemeinsame Demo-Daten für den Seed und die Beispieldateien in samples/

export const NACHUNTERNEHMER = [
  { firma: "Aufzüge Rhein-Main GmbH", ansprechpartner: "Frau Becker", email: "service@aufzuege-rm.example", telefon: "069 123456", konditionen: "Rahmenvertrag 2026, 14 Tage Zahlungsziel" },
  { firma: "Brandschutztechnik Hessen GmbH", ansprechpartner: "Herr Yilmaz", email: "wartung@bs-hessen.example", telefon: "06151 98765", konditionen: "Festpreis je Inspektion" },
  { firma: "Elektro Schwerer GmbH", ansprechpartner: "Herr Schwerer", email: "info@elektro-schwerer.example", telefon: "0611 55443", konditionen: "Stundensatz 68 €" },
  { firma: "Labor Aqua Analytik", ansprechpartner: "Dr. Roth", email: "proben@aqua-analytik.example", telefon: "06131 22110", konditionen: "Probenahme inkl. Befund" },
  { firma: "Torservice Süd", ansprechpartner: "Herr Klein", email: "service@torservice.example", telefon: "0621 77889", konditionen: "Jahrespauschale" },
];

// nu = Index in NACHUNTERNEHMER
export const LV_POSITIONEN = [
  { posNr: "1.1", anlage: "Personenaufzug Haupttreppenhaus", gewerk: "Fördertechnik", leistung: "Wartung nach Herstellervorgaben", norm: "DIN EN 13015", zyklus: "halbjährlich", zyklusMonate: 6, preis: 480, verantwortung: "extern", nu: 0 },
  { posNr: "1.2", anlage: "Personenaufzug Haupttreppenhaus", gewerk: "Fördertechnik", leistung: "Hauptprüfung durch zugelassene Überwachungsstelle", norm: "BetrSichV § 16", zyklus: "zweijährlich", zyklusMonate: 24, preis: 650, verantwortung: "extern", nu: 0 },
  { posNr: "2.1", anlage: "Brandmeldeanlage (BMA)", gewerk: "Brandschutz", leistung: "Inspektion und Wartung inkl. Meldertausch nach Bedarf", norm: "DIN 14675, VDE 0833", zyklus: "vierteljährlich", zyklusMonate: 3, preis: 390, verantwortung: "extern", nu: 1 },
  { posNr: "2.2", anlage: "Rauch- und Wärmeabzugsanlage (RWA)", gewerk: "Brandschutz", leistung: "Wartung und Funktionsprüfung", norm: "DIN 18232", zyklus: "jährlich", zyklusMonate: 12, preis: 520, verantwortung: "extern", nu: 1 },
  { posNr: "2.3", anlage: "Feuerlöscher (42 Stück)", gewerk: "Brandschutz", leistung: "Instandhaltungsprüfung", norm: "DIN 14406-4", zyklus: "zweijährlich", zyklusMonate: 24, preis: 210, verantwortung: "extern", nu: 1 },
  { posNr: "2.4", anlage: "Sicherheitsbeleuchtung", gewerk: "Elektro", leistung: "Funktionsprüfung und Dokumentation", norm: "DIN EN 50172", zyklus: "jährlich", zyklusMonate: 12, preis: 300, verantwortung: "intern", kostenstelle: "KST 4711 Elektro" },
  { posNr: "3.1", anlage: "RLT-Anlage Bürotrakt Nord", gewerk: "Lüftung/Klima", leistung: "Wartung inkl. Filterwechsel", norm: "VDI 6022", zyklus: "halbjährlich", zyklusMonate: 6, preis: 440, verantwortung: "intern", kostenstelle: "KST 4712 HLS" },
  { posNr: "3.2", anlage: "RLT-Anlage Bürotrakt Süd", gewerk: "Lüftung/Klima", leistung: "Wartung inkl. Filterwechsel", norm: "VDI 6022", zyklus: "halbjährlich", zyklusMonate: 6, preis: 440, verantwortung: "intern", kostenstelle: "KST 4712 HLS" },
  { posNr: "4.1", anlage: "Heizungsanlage Gas-Brennwertkessel", gewerk: "Heizung", leistung: "Jahreswartung Kessel und Brenner", norm: "DIN EN 15378", zyklus: "jährlich", zyklusMonate: 12, preis: 450, verantwortung: "intern", kostenstelle: "KST 4712 HLS" },
  { posNr: "4.2", anlage: "Trinkwasseranlage", gewerk: "Sanitär", leistung: "Legionellenuntersuchung (Probenahme an 6 Stellen)", norm: "TrinkwV § 31", zyklus: "jährlich", zyklusMonate: 12, preis: 380, verantwortung: "extern", nu: 3 },
  { posNr: "5.1", anlage: "Blitzschutzanlage", gewerk: "Elektro", leistung: "Wiederkehrende Prüfung", norm: "DIN EN 62305-3", zyklus: "jährlich", zyklusMonate: 12, preis: 360, verantwortung: "extern", nu: 2 },
  { posNr: "5.2", anlage: "Ortsveränderliche elektrische Betriebsmittel", gewerk: "Elektro", leistung: "Prüfung nach DGUV Vorschrift 3", norm: "DGUV Vorschrift 3", zyklus: "jährlich", zyklusMonate: 12, preis: 620, verantwortung: "intern", kostenstelle: "KST 4711 Elektro" },
  { posNr: "5.3", anlage: "Netzersatzanlage (NEA)", gewerk: "Elektro", leistung: "Probelauf unter Last", norm: "DIN 6280-13", zyklus: "monatlich", zyklusMonate: 1, preis: 95, verantwortung: "intern", kostenstelle: "KST 4711 Elektro" },
  { posNr: "6.1", anlage: "Rolltor Tiefgarage", gewerk: "Tore/Türen", leistung: "Sachkundigenprüfung", norm: "ASR A1.7", zyklus: "jährlich", zyklusMonate: 12, preis: 180, verantwortung: "extern", nu: 4 },
];

// Kleineres zweites Objekt für die Portfolio-Ansicht im Dashboard
export const LV_POSITIONEN_FILIALE = [
  { posNr: "1.1", anlage: "Brandmeldeanlage (BMA)", gewerk: "Brandschutz", leistung: "Inspektion und Wartung", norm: "DIN 14675", zyklusMonate: 3, preis: 290, verantwortung: "extern", nu: 1 },
  { posNr: "1.2", anlage: "Feuerlöscher (12 Stück)", gewerk: "Brandschutz", leistung: "Instandhaltungsprüfung", norm: "DIN 14406-4", zyklusMonate: 24, preis: 90, verantwortung: "extern", nu: 1 },
  { posNr: "2.1", anlage: "Klimaanlage Kundenhalle", gewerk: "Lüftung/Klima", leistung: "Wartung Split-Geräte", norm: "VDI 6022", zyklusMonate: 6, preis: 260, verantwortung: "intern", kostenstelle: "KST 4712 HLS" },
  { posNr: "3.1", anlage: "Ortsveränderliche elektrische Betriebsmittel", gewerk: "Elektro", leistung: "Prüfung nach DGUV Vorschrift 3", norm: "DGUV Vorschrift 3", zyklusMonate: 12, preis: 210, verantwortung: "intern", kostenstelle: "KST 4711 Elektro" },
  { posNr: "3.2", anlage: "Sicherheitsbeleuchtung", gewerk: "Elektro", leistung: "Funktionsprüfung", norm: "DIN EN 50172", zyklusMonate: 12, preis: 150, verantwortung: "intern", kostenstelle: "KST 4711 Elektro" },
];

// Positionen, deren letzte fällige Wartung im Demo-Objekt bewusst offen bleibt
// → rot im Dashboard; die Beispielprotokolle in samples/ schließen diese Lücken
export const OFFEN_LASSEN = ["1.1", "2.1", "3.1", "3.2", "5.1"];

"use strict";

import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { styleText } from "node:util";

// node:sqlite ist in Node eingebaut → keine native Kompilierung (sqlite3) im Docker-Image nötig.
// Die API ist synchron; bei einem Prototypen mit einem Nutzer ist das unkritisch.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema.sql");
const dbPath = path.resolve(process.env.DB_PATH);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const dbExisted = fs.existsSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

// Schema ist idempotent (CREATE ... IF NOT EXISTS) und wird bei jedem Start ausgeführt
try {
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  console.log(
    styleText(
      "green",
      dbExisted
        ? `SQLite-Verbindung zu ${dbPath} hergestellt.`
        : `Neue SQLite-Datenbank unter ${dbPath} aus schema.sql angelegt.`,
    ),
  );
} catch (err) {
  console.error(styleText("red", "Fehler beim Initialisieren aus schema.sql: " + err.message));
  throw err;
}

// Hilfsfunktion: Transaktion um mehrere Statements
export function transaction(fn) {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Benutzer
// ---------------------------------------------------------------------------

// Query für: Login
export const getBenutzerByEmail = (email) =>
  db.prepare(`SELECT id, email, passwort_hash, name, rolle FROM benutzer WHERE email = ?`).get(email);

export const countBenutzer = () => db.prepare(`SELECT COUNT(*) AS anzahl FROM benutzer`).get().anzahl;

export const insertBenutzer = ({ email, passwortHash, name, rolle }) =>
  db
    .prepare(`INSERT INTO benutzer (email, passwort_hash, name, rolle) VALUES (?, ?, ?, ?)`)
    .run(email, passwortHash, name, rolle).lastInsertRowid;

// ---------------------------------------------------------------------------
// Objekte
// ---------------------------------------------------------------------------

export const getAlleObjekte = () =>
  db.prepare(`SELECT id, name, adresse, auftraggeber, plan_start, portal_token FROM objekte ORDER BY name`).all();

export const getObjektById = (id) =>
  db.prepare(`SELECT id, name, adresse, auftraggeber, plan_start, portal_token FROM objekte WHERE id = ?`).get(id);

export const getObjektByPortalToken = (token) =>
  db.prepare(`SELECT id, name, adresse, auftraggeber FROM objekte WHERE portal_token = ?`).get(token);

export const insertObjekt = ({ name, adresse, auftraggeber, planStart, portalToken }) =>
  db
    .prepare(`INSERT INTO objekte (name, adresse, auftraggeber, plan_start, portal_token) VALUES (?, ?, ?, ?, ?)`)
    .run(name, adresse, auftraggeber, planStart, portalToken).lastInsertRowid;

export const deleteObjekt = (id) => db.prepare(`DELETE FROM objekte WHERE id = ?`).run(id).changes;

// ---------------------------------------------------------------------------
// Nachunternehmer
// ---------------------------------------------------------------------------

export const getAlleNachunternehmer = () =>
  db.prepare(`SELECT id, firma, ansprechpartner, email, telefon, konditionen FROM nachunternehmer ORDER BY firma`).all();

export const insertNachunternehmer = ({ firma, ansprechpartner, email, telefon, konditionen }) =>
  db
    .prepare(`INSERT INTO nachunternehmer (firma, ansprechpartner, email, telefon, konditionen) VALUES (?, ?, ?, ?, ?)`)
    .run(firma, ansprechpartner ?? null, email ?? null, telefon ?? null, konditionen ?? null).lastInsertRowid;

export const updateNachunternehmer = (id, { firma, ansprechpartner, email, telefon, konditionen }) =>
  db
    .prepare(`UPDATE nachunternehmer SET firma = ?, ansprechpartner = ?, email = ?, telefon = ?, konditionen = ? WHERE id = ?`)
    .run(firma, ansprechpartner ?? null, email ?? null, telefon ?? null, konditionen ?? null, id).changes;

export const deleteNachunternehmer = (id) => db.prepare(`DELETE FROM nachunternehmer WHERE id = ?`).run(id).changes;

// ---------------------------------------------------------------------------
// LV-Dokumente & Positionen
// ---------------------------------------------------------------------------

export const insertLvDokument = ({ objektId, dateiname, pfad, methode }) =>
  db
    .prepare(`INSERT INTO lv_dokumente (objekt_id, dateiname, pfad, methode) VALUES (?, ?, ?, ?)`)
    .run(objektId, dateiname, pfad, methode).lastInsertRowid;

export const getLvDokumenteByObjekt = (objektId) =>
  db
    .prepare(
      `SELECT d.id, d.dateiname, d.methode, d.importiert_am,
              (SELECT COUNT(*) FROM positionen p WHERE p.lv_dokument_id = d.id) AS anzahl_positionen
       FROM lv_dokumente d WHERE d.objekt_id = ? ORDER BY d.importiert_am DESC`,
    )
    .all(objektId);

export const insertPosition = (p) =>
  db
    .prepare(
      `INSERT INTO positionen (objekt_id, lv_dokument_id, pos_nr, anlage, gewerk, leistung, norm, zyklus_monate,
                               preis, verantwortung, kostenstelle, nachunternehmer_id, stichworte)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      p.objektId,
      p.lvDokumentId ?? null,
      p.posNr ?? null,
      p.anlage,
      p.gewerk ?? null,
      p.leistung ?? null,
      p.norm ?? null,
      p.zyklusMonate,
      p.preis ?? null,
      p.verantwortung ?? "intern",
      p.kostenstelle ?? null,
      p.nachunternehmerId ?? null,
      p.stichworte ?? null,
    ).lastInsertRowid;

export const getPositionenByObjekt = (objektId) =>
  db
    .prepare(
      `SELECT p.*, n.firma AS nachunternehmer_firma
       FROM positionen p LEFT JOIN nachunternehmer n ON n.id = p.nachunternehmer_id
       WHERE p.objekt_id = ? ORDER BY p.pos_nr, p.id`,
    )
    .all(objektId);

export const getPositionById = (id) => db.prepare(`SELECT * FROM positionen WHERE id = ?`).get(id);

// Nur die Disposition (intern/extern) ist im Prototyp editierbar
export const updatePositionDisposition = (id, { verantwortung, kostenstelle, nachunternehmerId }) =>
  db
    .prepare(`UPDATE positionen SET verantwortung = ?, kostenstelle = ?, nachunternehmer_id = ? WHERE id = ?`)
    .run(verantwortung, kostenstelle ?? null, nachunternehmerId ?? null, id).changes;

export const deletePosition = (id) => db.prepare(`DELETE FROM positionen WHERE id = ?`).run(id).changes;

// ---------------------------------------------------------------------------
// Termine (Jahresplan)
// ---------------------------------------------------------------------------

export const insertTermin = (positionId, faelligAm) =>
  db.prepare(`INSERT INTO termine (position_id, faellig_am) VALUES (?, ?)`).run(positionId, faelligAm).lastInsertRowid;

// Alle Termine inkl. Positions- und Objektdaten (Basis für Ampel, Dashboard, Matching)
const TERMIN_SELECT = `
  SELECT t.id, t.position_id, t.faellig_am, t.status, t.protokoll_id, t.nachgewiesen_am,
         p.objekt_id, p.pos_nr, p.anlage, p.gewerk, p.leistung, p.norm, p.zyklus_monate,
         p.verantwortung, p.kostenstelle, p.stichworte,
         n.firma AS nachunternehmer_firma, o.name AS objekt_name
  FROM termine t
  JOIN positionen p ON p.id = t.position_id
  JOIN objekte o ON o.id = p.objekt_id
  LEFT JOIN nachunternehmer n ON n.id = p.nachunternehmer_id`;

export const getTermineByObjekt = (objektId) =>
  db.prepare(`${TERMIN_SELECT} WHERE p.objekt_id = ? ORDER BY t.faellig_am, p.pos_nr`).all(objektId);

export const getAlleTermine = () => db.prepare(`${TERMIN_SELECT} ORDER BY t.faellig_am`).all();

export const getOffeneTermineByObjekt = (objektId) =>
  db.prepare(`${TERMIN_SELECT} WHERE p.objekt_id = ? AND t.status = 'offen' ORDER BY t.faellig_am`).all(objektId);

export const getTerminById = (id) => db.prepare(`${TERMIN_SELECT} WHERE t.id = ?`).get(id);

export const setTerminNachgewiesen = (terminId, protokollId, nachgewiesenAm) =>
  db
    .prepare(`UPDATE termine SET status = 'nachgewiesen', protokoll_id = ?, nachgewiesen_am = ? WHERE id = ?`)
    .run(protokollId, nachgewiesenAm, terminId).changes;

export const setTerminOffen = (terminId) =>
  db
    .prepare(`UPDATE termine SET status = 'offen', protokoll_id = NULL, nachgewiesen_am = NULL WHERE id = ?`)
    .run(terminId).changes;

// ---------------------------------------------------------------------------
// Protokolle
// ---------------------------------------------------------------------------

export const insertProtokoll = (p) =>
  db
    .prepare(
      `INSERT INTO protokolle (objekt_id, dateiname, pfad, mimetype, text, quelle, absender)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(p.objektId, p.dateiname, p.pfad, p.mimetype ?? null, p.text ?? null, p.quelle, p.absender ?? null)
    .lastInsertRowid;

export const updateProtokollZuordnung = (id, { terminId, konfidenz, zuordnung, vorschlaege, durchfuehrungAm, methode }) =>
  db
    .prepare(
      `UPDATE protokolle SET termin_id = ?, konfidenz = ?, zuordnung = ?, vorschlaege = ?,
                             durchfuehrung_am = COALESCE(?, durchfuehrung_am), methode = COALESCE(?, methode)
       WHERE id = ?`,
    )
    .run(terminId ?? null, konfidenz ?? null, zuordnung, vorschlaege ?? null, durchfuehrungAm ?? null, methode ?? null, id)
    .changes;

const PROTOKOLL_SELECT = `
  SELECT pr.id, pr.objekt_id, pr.dateiname, pr.mimetype, pr.quelle, pr.absender, pr.eingegangen_am,
         pr.durchfuehrung_am, pr.termin_id, pr.konfidenz, pr.zuordnung, pr.vorschlaege, pr.methode,
         o.name AS objekt_name, t.faellig_am, p.pos_nr, p.anlage
  FROM protokolle pr
  JOIN objekte o ON o.id = pr.objekt_id
  LEFT JOIN termine t ON t.id = pr.termin_id
  LEFT JOIN positionen p ON p.id = t.position_id`;

export const getProtokolle = ({ objektId, zuordnung } = {}) => {
  const where = [];
  const params = [];
  if (objektId) {
    where.push("pr.objekt_id = ?");
    params.push(objektId);
  }
  if (zuordnung) {
    where.push("pr.zuordnung = ?");
    params.push(zuordnung);
  }
  const sql = `${PROTOKOLL_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY pr.eingegangen_am DESC, pr.id DESC`;
  return db.prepare(sql).all(...params);
};

export const getProtokollById = (id) => db.prepare(`SELECT * FROM protokolle WHERE id = ?`).get(id);

export const deleteProtokoll = (id) => db.prepare(`DELETE FROM protokolle WHERE id = ?`).run(id).changes;

// Northstar: automatisch zugeordnete Nachweise je Kalenderwoche (letzte 8 Wochen)
export const getAutoZuordnungenProWoche = () =>
  db
    .prepare(
      `SELECT strftime('%Y-W%W', eingegangen_am) AS woche,
              SUM(CASE WHEN zuordnung = 'auto' THEN 1 ELSE 0 END) AS automatisch,
              COUNT(*) AS gesamt
       FROM protokolle
       WHERE eingegangen_am >= datetime('now', '-56 days')
       GROUP BY woche ORDER BY woche`,
    )
    .all();

export const getZuordnungsStatistik = () =>
  db.prepare(`SELECT zuordnung, COUNT(*) AS anzahl FROM protokolle GROUP BY zuordnung`).all();

// ---------------------------------------------------------------------------
// Mängel
// ---------------------------------------------------------------------------

export const insertMangel = (protokollId, positionId, beschreibung) =>
  db
    .prepare(`INSERT INTO maengel (protokoll_id, position_id, beschreibung) VALUES (?, ?, ?)`)
    .run(protokollId, positionId ?? null, beschreibung).lastInsertRowid;

export const getMaengel = ({ objektId, status } = {}) => {
  const where = [];
  const params = [];
  if (objektId) {
    where.push("pr.objekt_id = ?");
    params.push(objektId);
  }
  if (status) {
    where.push("m.status = ?");
    params.push(status);
  }
  return db
    .prepare(
      `SELECT m.id, m.beschreibung, m.status, m.erstellt_am, m.protokoll_id, m.position_id,
              pr.dateiname AS protokoll_datei, pr.objekt_id, o.name AS objekt_name, p.pos_nr, p.anlage
       FROM maengel m
       JOIN protokolle pr ON pr.id = m.protokoll_id
       JOIN objekte o ON o.id = pr.objekt_id
       LEFT JOIN positionen p ON p.id = m.position_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY m.status, m.erstellt_am DESC`,
    )
    .all(...params);
};

export const updateMangelStatus = (id, status) =>
  db.prepare(`UPDATE maengel SET status = ? WHERE id = ?`).run(status, id).changes;

export const updateMangelPosition = (protokollId, positionId) =>
  db.prepare(`UPDATE maengel SET position_id = ? WHERE protokoll_id = ?`).run(positionId, protokollId).changes;

export default db;

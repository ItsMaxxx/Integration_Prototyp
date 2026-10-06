-- PROOFM – Datenmodell
-- Datumswerte werden als ISO-Text gespeichert (YYYY-MM-DD bzw. YYYY-MM-DDTHH:MM:SS)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS benutzer (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    passwort_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    rolle         TEXT NOT NULL DEFAULT 'objektleiter' CHECK (rolle IN ('objektleiter', 'admin'))
);

CREATE TABLE IF NOT EXISTS objekte (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    adresse       TEXT,
    auftraggeber  TEXT,
    plan_start    TEXT NOT NULL,                 -- Beginn des Wartungsjahres
    portal_token  TEXT NOT NULL UNIQUE,          -- Upload-Link für Nachunternehmer (ohne Login)
    erstellt_am   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nachunternehmer (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    firma           TEXT NOT NULL,
    ansprechpartner TEXT,
    email           TEXT,
    telefon         TEXT,
    konditionen     TEXT
);

CREATE TABLE IF NOT EXISTS lv_dokumente (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    objekt_id    INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
    dateiname    TEXT NOT NULL,
    pfad         TEXT NOT NULL,
    methode      TEXT NOT NULL CHECK (methode IN ('regel', 'claude')),
    importiert_am TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS positionen (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    objekt_id          INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
    lv_dokument_id     INTEGER REFERENCES lv_dokumente(id) ON DELETE SET NULL,
    pos_nr             TEXT,
    anlage             TEXT NOT NULL,
    gewerk             TEXT,
    leistung           TEXT,
    norm               TEXT,
    zyklus_monate      INTEGER NOT NULL DEFAULT 12,
    preis              REAL,
    verantwortung      TEXT NOT NULL DEFAULT 'intern' CHECK (verantwortung IN ('intern', 'extern')),
    kostenstelle       TEXT,
    nachunternehmer_id INTEGER REFERENCES nachunternehmer(id) ON DELETE SET NULL,
    stichworte         TEXT                      -- kommagetrennt, für das Protokoll-Matching
);

-- Jahresplan: ein Eintrag je fälliger Wartung
CREATE TABLE IF NOT EXISTS termine (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    position_id     INTEGER NOT NULL REFERENCES positionen(id) ON DELETE CASCADE,
    faellig_am      TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'nachgewiesen')),
    protokoll_id    INTEGER REFERENCES protokolle(id) ON DELETE SET NULL,
    nachgewiesen_am TEXT
);

CREATE TABLE IF NOT EXISTS protokolle (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    objekt_id        INTEGER NOT NULL REFERENCES objekte(id) ON DELETE CASCADE,
    dateiname        TEXT NOT NULL,
    pfad             TEXT NOT NULL,
    mimetype         TEXT,
    text             TEXT,
    quelle           TEXT NOT NULL DEFAULT 'intern' CHECK (quelle IN ('intern', 'portal')),
    absender         TEXT,                       -- Freitext beim Portal-Upload
    eingegangen_am   TEXT NOT NULL DEFAULT (datetime('now')),
    durchfuehrung_am TEXT,
    termin_id        INTEGER REFERENCES termine(id) ON DELETE SET NULL,
    konfidenz        REAL,
    zuordnung        TEXT NOT NULL DEFAULT 'offen' CHECK (zuordnung IN ('auto', 'pruefen', 'manuell', 'offen')),
    vorschlaege      TEXT,                       -- JSON: Top-3-Kandidaten für die Prüf-Warteschlange
    methode          TEXT                        -- 'regel' oder 'claude'
);

CREATE TABLE IF NOT EXISTS maengel (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    protokoll_id INTEGER NOT NULL REFERENCES protokolle(id) ON DELETE CASCADE,
    position_id  INTEGER REFERENCES positionen(id) ON DELETE SET NULL,
    beschreibung TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'erledigt')),
    erstellt_am  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_positionen_objekt ON positionen(objekt_id);
CREATE INDEX IF NOT EXISTS idx_termine_position ON termine(position_id);
CREATE INDEX IF NOT EXISTS idx_protokolle_objekt ON protokolle(objekt_id);

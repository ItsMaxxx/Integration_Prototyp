# PROOFM – Prototyp

Compliance- und Nachweisplattform für das technische Facility Management
(Portfolioarbeit „Produktmanagement & agile Produktentwicklung“, DHBW Mannheim).

> **Vom Leistungsverzeichnis zum lückenlosen Nachweis – ohne CAFM-Projekt.**

Der Prototyp setzt die Roadmap-Stufe **„Now“** aus dem Strategiedokument um:

| Baustein | Umsetzung im Prototyp |
|---|---|
| 1 · LV-Ingestion | LV als **XLSX, CSV oder PDF** hochladen → Positionen (Pos., Anlage, Leistung, Norm, Zyklus, Preis, intern/extern) werden extrahiert → Vorschau prüfen/korrigieren → übernehmen |
| 2 · Wartungsplan & Disposition | Jahresplan wird aus dem Zyklus erzeugt; je Position intern (Kostenstelle) oder extern (Nachunternehmer) |
| 3 · Nachweis-Engine | Protokolle per Upload (intern) oder **Nachunternehmer-Portal ohne Login** → Text lesen → automatisch der richtigen Wartungsposition zuordnen → Status „nachgewiesen“. Mängel werden als Folgeaufgaben extrahiert. Unsichere Fälle landen in der **Prüf-Warteschlange** (Human-in-the-Loop) |
| 4 · Eskalation & Ampel | Ampel je Termin (grün = nachgewiesen, gelb = Frist ≤ 4 Wochen, rot = überfällig), Compliance-Score je Objekt, Eskalationsliste, **Northstar**: automatisch zugeordnete Nachweise pro Woche |

Bewusst **nicht** enthalten: Beschaffungsstrecke, Auftraggeber-Lesezugang, ERP-/CAFM-Schnittstellen, Mail-Inbox (IMAP).

---

## Quickstart (Docker Desktop)

```bash
copy .env.example .env      # macOS/Linux: cp .env.example .env
docker compose up --build -d
```

→ **http://localhost:8080** · Login: `objektleiter@proofm.de` / `proofm2026` (aus der `.env`)

Beim ersten Start werden automatisch zwei Demo-Objekte mit Historie angelegt. Im Bürohaus sind einige Wartungen
bewusst **überfällig**, damit Ampel und Eskalation etwas zeigen.

Zurücksetzen (Datenbank + Uploads löschen): `docker compose down -v`

### Lokal ohne Docker

Voraussetzung: Node.js ≥ 22.13 (wegen des eingebauten `node:sqlite`).

```bash
npm install
npm run dev        # Backend :3000 + Vite :5173 (Proxy /api → :3000)
```

→ http://localhost:5173

---

## Demo-Ablauf (ca. 5 Minuten)

Die Beispieldateien liegen in `samples/`. Neu erzeugen mit `npm run samples`. Die Protokolldaten passen sich dabei
dem heutigen Datum an.

1. **Übersicht**: Compliance-Score, überfällige Termine, Eskalationsliste, Northstar-Chart.
2. **Protokoll-Eingang** → Objekt „Bürohaus Mainzer Landstraße“ → alle vier `samples/protokoll-*` hochladen:
   - `protokoll-aufzug.pdf` → **automatisch** Pos. 1.1 zugeordnet, die Ampel springt auf grün (*Aha-Moment*)
   - `protokoll-bma-maengel.pdf` → automatisch Pos. 2.1 zugeordnet **und 2 Mängel** als Folgeaufgaben angelegt
   - `protokoll-rlt-mehrdeutig.txt` → passt auf RLT Nord **und** Süd → **Prüf-Warteschlange**, per Klick bestätigen
   - `protokoll-unbekannt.txt` → keine passende Pflicht → Prüf-Warteschlange ohne Vorschlag
3. **Objekt anlegen** → `samples/lv-beispiel.xlsx` (oder `.csv`/`.pdf`) einlesen → Vorschau → übernehmen → Jahresplan.
4. Im Objekt: **Positionen & Disposition** intern/extern umstellen, Nachunternehmer zuweisen.
5. **Nachunternehmer-Portal**: im Objekt „Öffnen ↗“ → ein Protokoll ohne Login hochladen (z. B. im Inkognito-Fenster).

---

## KI-Unterstützung (optional)

Ohne API-Key läuft alles **regelbasiert**, also über Spaltenerkennung, Fachbegriff-Synonyme (BMA ↔ Brandmeldeanlage,
RLT ↔ Lüftung …), Positionsnummern, Normen und die Nähe zur Frist.

Mit `ANTHROPIC_API_KEY` in der `.env` übernimmt **Claude** (Standard: `claude-opus-5-5`, über `CLAUDE_MODEL`
änderbar):

- LV-Extraktion aus Fließtext-PDFs bzw. gescannten PDFs (Tabellen werden weiterhin regelbasiert gelesen)
- Zuordnung und Mängelerkennung bei Protokollen, auch bei gescannten PDFs und Fotos (PNG/JPG)

Bei Fehlern oder einer Ablehnung fällt das System automatisch auf die Regeln zurück. Serverseitige Fallbacks
(`fallbacks: "default"`) sind aktiviert.

Nach dem Ändern der `.env`: `docker compose up -d --force-recreate backend`

---

## Wie die Zuordnung funktioniert

Je offenem Termin des Objekts wird ein Score von 0 bis 1 berechnet (`backend/controller/lib/matcher.js`):

| Merkmal | Gewicht |
|---|---|
| Positionsnummer im Protokoll („Pos. 2.1“, „LV-Pos. 1.1“) | +0,55 |
| Anlagen-Begriffsgruppe (Synonyme in `fachbegriffe.js`) | bis +0,30 |
| Ortszusatz passt / widerspricht (Nord/Süd, Haus A …) | +0,10 / −0,15 |
| Norm im Protokoll | +0,10 |
| Durchführungsdatum nahe an der Frist | bis +0,15 |

**Automatisch** zugeordnet wird ab einem Score von **0,8** und mindestens 0,15 Abstand zur nächstbesten Position.
Alles andere geht in die Prüf-Warteschlange. Das entspricht der „Konfidenzschwelle als Produktfeature“ aus der
Risikoanalyse (Feasibility).

**Compliance-Score** = nachgewiesene Termine ÷ (bis heute fällige + bereits nachgewiesene Termine).

---

## Architektur

```
Browser ──► nginx (Container "frontend", Port 8080)
              ├─ /        → React-Build (SPA)
              └─ /api/*   → proxy_pass http://backend:3000
backend (Express, nur im internen Docker-Netz)
  └─ Volume proofm-data:/app/data → proofm.db (SQLite) + uploads/
```

Aufbau angelehnt an die Projekte `dhbw-esc` (Express-MVC, Sessions, eine Funktion pro Query in
`model/database.js`) und `maximilian-schmelzer` (Monorepo, React/Vite + nginx, Compose-Netz). **Kein Cloudflare
Tunnel**: Erreichbar ist die Anwendung lokal über den Port 8080.

```
Integration Prototyp/
├── docker-compose.yml   .env.example   package.json (npm workspaces)
├── samples/                     Beispiel-LVs und -Protokolle
├── backend/
│   ├── controller/
│   │   ├── app.js               Einstieg, Router, Seed beim ersten Start
│   │   ├── routes/              auth, dashboard, objekte, lv, positionen, protokolle, nachunternehmer, portal
│   │   ├── middleware/          session, authMiddleware (requireAuth)
│   │   └── lib/                 lvParser, matcher, fachbegriffe, plan (Ampel/Score), claude, textExtract, upload
│   ├── model/                   schema.sql, database.js (Queries), *Model.js (Geschäftslogik)
│   └── scripts/                 seed.js, demo-daten.js, make-samples.js
└── frontend/
    ├── nginx.conf   Dockerfile
    └── src/  App.jsx  api.js  components/  pages/
```

### Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|---|---|---|
| `APP_PORT` | ✓ | Port des Backends (Container: 3000) |
| `SESSION_SECRET` | ✓ | Geheimnis für Session-Cookies |
| `DB_PATH` | ✓ | SQLite-Datei (Container: `/app/data/proofm.db`) |
| `UPLOAD_DIR` | ✓ | Ablage für LVs/Protokolle (Container: `/app/data/uploads`) |
| `DEMO_EMAIL` / `DEMO_PASSWORT` | ✓ | Demo-Zugang, wird beim ersten Start angelegt |
| `ANTHROPIC_API_KEY` | – | aktiviert die KI-Unterstützung |
| `CLAUDE_MODEL` | – | Standard `claude-opus-5-5` |

### API (Auszug)

| Methode | Route | Zweck |
|---|---|---|
| POST | `/api/login` · `/api/logout` | Session |
| GET | `/api/dashboard` | Objekte + Score, Eskalationen, Northstar |
| GET/POST | `/api/objekte` · `/api/objekte/:id` | Objekte, Detail mit Positionen + Jahresplan |
| POST | `/api/objekte/:id/lv` | LV hochladen → Vorschlag |
| POST | `/api/objekte/:id/lv/:lvId/uebernehmen` | Positionen speichern + Termine erzeugen |
| PATCH | `/api/positionen/:id` | Disposition intern/extern |
| POST | `/api/objekte/:id/protokolle` | Protokolle hochladen → Zuordnung |
| GET | `/api/protokolle?zuordnung=pruefen` | Prüf-Warteschlange |
| POST | `/api/protokolle/:id/bestaetigen` · `/aufheben` | Human-in-the-Loop |
| GET/PATCH | `/api/maengel` | Folgeaufgaben |
| GET/POST | `/api/portal/:token` · `/api/portal/:token/upload` | Nachunternehmer-Portal (ohne Login) |

## Bekannte Grenzen des Prototyps

- Ein Benutzer und eine Rolle; Sessions liegen im Arbeitsspeicher (nach einem Neustart neu einloggen).
- Der Jahresplan umfasst 12 Monate ab Planstart; Zyklen über 12 Monate erzeugen einen Termin im Planjahr.
- Gescannte PDFs und Fotos sind ohne API-Key nicht lesbar und landen in der Prüf-Warteschlange.
- Kein HTTPS. Für den Betrieb hinter einem Reverse-Proxy `cookie.secure` in `middleware/session.js` aktivieren.

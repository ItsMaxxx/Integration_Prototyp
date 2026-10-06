"use strict";

// Daten aus der .env laden und überprüfen
// Lokal liegt die .env im Projekt-Root, im Container kommen die Variablen über env_file
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false, quiet: true, encoding: "utf8" });
// override: false -> Variablen aus docker-compose (environment) haben Vorrang vor der .env

import { checkAllEnv } from "./lib/env.js";
if (checkAllEnv()) {
  throw new Error("Fehlende oder ungültige ENV-Variablen in der .env-Datei.");
}

import express from "express";
import { execFileSync } from "child_process";
// execFileSync wird genutzt, um in app.listen() Fehlerinformationen auszugeben, wenn der Port nicht frei ist
import { styleText } from "node:util";

// Dynamische Imports: database.js liest DB_PATH beim Laden – erst nach dotenv/checkAllEnv
const { default: sessionMiddleware } = await import("./middleware/session.js");
const { default: authRouter } = await import("./routes/auth.js");
const { default: dashboardRouter } = await import("./routes/dashboard.js");
const { default: objekteRouter } = await import("./routes/objekte.js");
const { default: lvRouter } = await import("./routes/lv.js");
const { default: positionenRouter } = await import("./routes/positionen.js");
const { default: protokolleRouter } = await import("./routes/protokolle.js");
const { default: nachunternehmerRouter } = await import("./routes/nachunternehmer.js");
const { default: portalRouter } = await import("./routes/portal.js");
const { seedDemoBenutzer } = await import("../model/authModel.js");
const { seedDemo } = await import("../scripts/seed.js");
const claude = await import("./lib/claude.js");

// Beim ersten Start: Demo-Benutzer + Demo-Objekte anlegen
seedDemoBenutzer();
seedDemo();

const app = express();
const port = process.env.APP_PORT;

// Hinter nginx: echte Client-IP für das Rate-Limiting
app.set("trust proxy", 1);

// Middleware, um JSON-Daten aus dem Frontend lesen zu können
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Router einhängen
app.use(authRouter);            // Login, Logout, Session-Check
app.use(dashboardRouter);       // Portfolio, Eskalationen, Northstar
app.use(objekteRouter);         // Objekte + Detail (Positionen, Jahresplan)
app.use(lvRouter);              // LV-Ingestion
app.use(positionenRouter);      // Disposition intern/extern
app.use(protokolleRouter);      // Nachweis-Engine, Prüf-Warteschlange, Mängel
app.use(nachunternehmerRouter); // Stammdaten Nachunternehmer
app.use(portalRouter);          // Upload-Portal ohne Login

// Unbekannte API-Routen als JSON beantworten
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "Endpunkt nicht gefunden." }));

// Letzte Absicherung: unerwartete Fehler als JSON statt Stacktrace
app.use((err, req, res, next) => {
  console.error(styleText("red", "Unerwarteter Fehler: " + err.message));
  res.status(500).json({ success: false, message: "Interner Serverfehler." });
});

// Ist der Port verfügbar?
const server = app.listen(port, () => {
  console.log(styleText("green", `PROOFM-Backend bereit auf Port ${port}`));
  console.log(
    styleText(
      claude.istAktiv() ? "green" : "yellow",
      claude.istAktiv()
        ? `KI-Unterstützung aktiv (${process.env.CLAUDE_MODEL || "claude-opus-5-5"})`
        : "Kein ANTHROPIC_API_KEY – LV-Extraktion und Matching laufen regelbasiert.",
    ),
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(styleText("red", `Port ${port} ist bereits belegt.`));
    try {
      // Windows → netstat, sonst (macOS/Linux) → lsof
      const info =
        process.platform === "win32"
          ? execFileSync("netstat", ["-ano"])
              .toString()
              .split("\n")
              .filter((l) => l.includes(`:${port}`))
              .join("\n")
              .trim()
          : execFileSync("lsof", ["-i", `:${port}`])
              .toString()
              .trim();
      console.error(styleText("yellow", `Belegender Prozess:\n${info}`));
    } catch {
      console.error(styleText("yellow", "Prozess-Info konnte nicht ermittelt werden."));
    }
    process.exit(1);
  } else {
    throw err;
  }
});

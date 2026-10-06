"use strict";

import express from "express";
import fs from "fs";
import { requireAuth } from "../middleware/authMiddleware.js";
import { protokollUpload, handleUpload } from "../lib/upload.js";
import * as protokollModel from "../../model/protokollModel.js";
import * as db from "../../model/database.js";

const router = express.Router();

// API-Endpunkt: Protokolle auflisten (Filter: objektId, zuordnung)
router.get("/api/protokolle", requireAuth, (req, res) => {
  const protokolle = db
    .getProtokolle({ objektId: Number(req.query.objektId) || null, zuordnung: req.query.zuordnung || null })
    .map((p) => ({ ...p, vorschlaege: p.vorschlaege ? JSON.parse(p.vorschlaege) : [] }));
  res.json({ success: true, protokolle });
});

// API-Endpunkt: Protokolle hochladen (mehrere Dateien) → Nachweis-Engine (Baustein 4)
router.post(
  "/api/objekte/:id/protokolle",
  requireAuth,
  handleUpload(protokollUpload.array("dateien", 20)),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Keine Dateien hochgeladen." });
    }
    const ergebnisse = [];
    for (const datei of req.files) {
      ergebnisse.push(await protokollModel.verarbeite({ objektId: Number(req.params.id), datei, quelle: "intern" }));
    }
    res.json({ success: ergebnisse.every((e) => e.success), ergebnisse });
  },
);

// API-Endpunkt: Originaldatei anzeigen (Nachweis gegenüber dem Auftraggeber)
router.get("/api/protokolle/:id/datei", requireAuth, (req, res) => {
  const protokoll = db.getProtokollById(Number(req.params.id));
  if (!protokoll || !fs.existsSync(protokoll.pfad)) {
    return res.status(404).json({ success: false, message: "Datei nicht gefunden." });
  }
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(protokoll.dateiname)}`);
  if (protokoll.mimetype) res.type(protokoll.mimetype);
  res.sendFile(protokoll.pfad);
});

// API-Endpunkt: Zuordnung bestätigen/korrigieren (Human-in-the-Loop)
router.post("/api/protokolle/:id/bestaetigen", requireAuth, (req, res) => {
  const terminId = Number(req.body?.terminId);
  if (!terminId) return res.status(400).json({ success: false, message: "terminId fehlt." });
  const result = protokollModel.bestaetige(Number(req.params.id), terminId);
  res.status(result.success ? 200 : 400).json(result);
});

// API-Endpunkt: Zuordnung aufheben
router.post("/api/protokolle/:id/aufheben", requireAuth, (req, res) => {
  const result = protokollModel.aufheben(Number(req.params.id));
  res.status(result.success ? 200 : 400).json(result);
});

// API-Endpunkt: Protokoll löschen (Nachweis wird zurückgenommen)
router.delete("/api/protokolle/:id", requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const protokoll = db.getProtokollById(id);
  if (!protokoll) return res.status(404).json({ success: false, message: "Protokoll nicht gefunden." });
  protokollModel.aufheben(id);
  db.deleteProtokoll(id);
  fs.rm(protokoll.pfad, { force: true }, () => {});
  res.json({ success: true });
});

// API-Endpunkt: Mängel (Folgeaufgaben aus Protokollen)
router.get("/api/maengel", requireAuth, (req, res) => {
  res.json({
    success: true,
    maengel: db.getMaengel({ objektId: Number(req.query.objektId) || null, status: req.query.status || null }),
  });
});

router.patch("/api/maengel/:id", requireAuth, (req, res) => {
  const status = req.body?.status;
  if (!["offen", "erledigt"].includes(status)) {
    return res.status(400).json({ success: false, message: "Status muss 'offen' oder 'erledigt' sein." });
  }
  const geaendert = db.updateMangelStatus(Number(req.params.id), status);
  res.status(geaendert ? 200 : 404).json({ success: Boolean(geaendert) });
});

export default router;

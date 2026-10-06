"use strict";

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as objektModel from "../../model/objektModel.js";
import * as db from "../../model/database.js";

const router = express.Router();

// API-Endpunkt: alle Objekte mit Ampel + Compliance-Score
router.get("/api/objekte", requireAuth, (req, res) => {
  res.json({ success: true, objekte: objektModel.listeMitKennzahlen() });
});

// API-Endpunkt: Objekt anlegen
router.post("/api/objekte", requireAuth, (req, res) => {
  const result = objektModel.anlegen(req.body || {});
  res.status(result.success ? 201 : 400).json(result);
});

// API-Endpunkt: Objekt-Detail (Positionen, Jahresplan, LV-Dokumente)
router.get("/api/objekte/:id", requireAuth, (req, res) => {
  const objekt = objektModel.detail(Number(req.params.id));
  if (!objekt) return res.status(404).json({ success: false, message: "Objekt nicht gefunden." });
  res.json({ success: true, objekt });
});

// API-Endpunkt: Objekt löschen (inkl. Positionen, Termine, Protokolle per CASCADE)
router.delete("/api/objekte/:id", requireAuth, (req, res) => {
  const geloescht = db.deleteObjekt(Number(req.params.id));
  res.status(geloescht ? 200 : 404).json({ success: Boolean(geloescht) });
});

export default router;

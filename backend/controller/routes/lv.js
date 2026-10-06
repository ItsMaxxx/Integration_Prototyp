"use strict";

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { lvUpload, handleUpload } from "../lib/upload.js";
import * as lvModel from "../../model/lvModel.js";

const router = express.Router();

// API-Endpunkt: LV hochladen → Positions-Vorschläge (Baustein 1)
router.post("/api/objekte/:id/lv", requireAuth, handleUpload(lvUpload.single("datei")), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Keine Datei hochgeladen." });
  const result = await lvModel.analysiere(Number(req.params.id), req.file);
  res.status(result.success ? 200 : 422).json(result);
});

// API-Endpunkt: geprüfte Positionen übernehmen → Jahresplan (Baustein 2)
router.post("/api/objekte/:id/lv/:lvId/uebernehmen", requireAuth, (req, res) => {
  const result = lvModel.uebernehmen(Number(req.params.id), Number(req.params.lvId), req.body?.positionen);
  res.status(result.success ? 200 : 400).json(result);
});

// API-Endpunkt: Positionen manuell hinzufügen (ohne LV-Dokument)
router.post("/api/objekte/:id/positionen", requireAuth, (req, res) => {
  const result = lvModel.uebernehmen(Number(req.params.id), null, [req.body || {}]);
  res.status(result.success ? 200 : 400).json(result);
});

export default router;

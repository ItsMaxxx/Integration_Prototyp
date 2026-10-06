"use strict";

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as db from "../../model/database.js";

const router = express.Router();

router.get("/api/nachunternehmer", requireAuth, (req, res) => {
  res.json({ success: true, nachunternehmer: db.getAlleNachunternehmer() });
});

router.post("/api/nachunternehmer", requireAuth, (req, res) => {
  if (!req.body?.firma?.trim()) return res.status(400).json({ success: false, message: "Firma fehlt." });
  const id = db.insertNachunternehmer(req.body);
  res.status(201).json({ success: true, id });
});

router.put("/api/nachunternehmer/:id", requireAuth, (req, res) => {
  if (!req.body?.firma?.trim()) return res.status(400).json({ success: false, message: "Firma fehlt." });
  const geaendert = db.updateNachunternehmer(Number(req.params.id), req.body);
  res.status(geaendert ? 200 : 404).json({ success: Boolean(geaendert) });
});

router.delete("/api/nachunternehmer/:id", requireAuth, (req, res) => {
  const geloescht = db.deleteNachunternehmer(Number(req.params.id));
  res.status(geloescht ? 200 : 404).json({ success: Boolean(geloescht) });
});

export default router;

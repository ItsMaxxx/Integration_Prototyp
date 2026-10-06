"use strict";

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as db from "../../model/database.js";

const router = express.Router();

// API-Endpunkt: Disposition einer Position ändern (intern ↔ extern, Kostenstelle, Nachunternehmer)
router.patch("/api/positionen/:id", requireAuth, (req, res) => {
  const { verantwortung, kostenstelle, nachunternehmerId } = req.body || {};
  if (!["intern", "extern"].includes(verantwortung)) {
    return res.status(400).json({ success: false, message: "Verantwortung muss 'intern' oder 'extern' sein." });
  }
  const geaendert = db.updatePositionDisposition(Number(req.params.id), {
    verantwortung,
    kostenstelle: verantwortung === "intern" ? kostenstelle || null : null,
    nachunternehmerId: verantwortung === "extern" ? Number(nachunternehmerId) || null : null,
  });
  res.status(geaendert ? 200 : 404).json({ success: Boolean(geaendert) });
});

// API-Endpunkt: Position löschen (Termine werden per CASCADE entfernt)
router.delete("/api/positionen/:id", requireAuth, (req, res) => {
  const geloescht = db.deletePosition(Number(req.params.id));
  res.status(geloescht ? 200 : 404).json({ success: Boolean(geloescht) });
});

export default router;

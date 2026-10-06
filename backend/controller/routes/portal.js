"use strict";

import express from "express";
import rateLimit from "express-rate-limit";
import { protokollUpload, handleUpload } from "../lib/upload.js";
import * as protokollModel from "../../model/protokollModel.js";
import * as db from "../../model/database.js";

// Nachunternehmer-Portal: Upload ohne Login über einen geheimen Link je Objekt
const router = express.Router();

const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: { success: false, message: "Zu viele Uploads. Bitte später erneut versuchen." },
});

// Bewusst nur Name + Adresse – keine Positionen oder Fristen nach außen geben
router.get("/api/portal/:token", portalLimiter, (req, res) => {
  const objekt = db.getObjektByPortalToken(req.params.token);
  if (!objekt) return res.status(404).json({ success: false, message: "Ungültiger Link." });
  res.json({ success: true, objekt: { name: objekt.name, adresse: objekt.adresse } });
});

router.post(
  "/api/portal/:token/upload",
  portalLimiter,
  handleUpload(protokollUpload.array("dateien", 10)),
  async (req, res) => {
    const objekt = db.getObjektByPortalToken(req.params.token);
    if (!objekt) return res.status(404).json({ success: false, message: "Ungültiger Link." });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Keine Dateien hochgeladen." });
    }
    const absender = String(req.body?.absender || "").slice(0, 120) || null;
    let ok = 0;
    for (const datei of req.files) {
      const r = await protokollModel.verarbeite({ objektId: objekt.id, datei, quelle: "portal", absender });
      if (r.success) ok++;
    }
    // Dem Nachunternehmer nur den Eingang bestätigen, keine internen Zuordnungsdetails
    res.json({ success: ok > 0, message: `${ok} von ${req.files.length} Datei(en) erfolgreich übermittelt.` });
  },
);

export default router;

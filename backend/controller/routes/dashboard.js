"use strict";

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import * as db from "../../model/database.js";
import * as objektModel from "../../model/objektModel.js";
import { mitAmpel } from "../lib/plan.js";

const router = express.Router();

// API-Endpunkt: Portfolio-Übersicht (Baustein 4: Eskalation & Ampel, Northstar)
router.get("/api/dashboard", requireAuth, (req, res) => {
  const objekte = objektModel.listeMitKennzahlen();

  // Eskalationsliste: alles, was rot (überfällig) oder gelb (≤ 28 Tage) ist
  const eskalationen = mitAmpel(db.getAlleTermine())
    .filter((t) => t.ampel === "rot" || t.ampel === "gelb")
    .sort((a, b) => a.faellig_am.localeCompare(b.faellig_am));

  // Northstar: automatisch zugeordnete Nachweise pro Woche + Automatisierungsgrad (Input-Metrik)
  const statistik = Object.fromEntries(db.getZuordnungsStatistik().map((s) => [s.zuordnung, s.anzahl]));
  const zugeordnet = (statistik.auto || 0) + (statistik.manuell || 0);
  const automatisierungsgrad = zugeordnet === 0 ? null : Math.round(((statistik.auto || 0) / zugeordnet) * 100);

  res.json({
    success: true,
    objekte,
    eskalationen,
    northstar: {
      wochen: db.getAutoZuordnungenProWoche(),
      automatisierungsgrad,
      pruefen: statistik.pruefen || 0,
    },
    offeneMaengel: db.getMaengel({ status: "offen" }).length,
  });
});

export default router;

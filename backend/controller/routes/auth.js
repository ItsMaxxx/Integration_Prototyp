"use strict";

import express from "express";
import rateLimit from "express-rate-limit";
import * as authModel from "../../model/authModel.js";
import * as claude from "../lib/claude.js";

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 50,
  message: { success: false, message: "Zu viele Login-Versuche. Bitte in ein paar Minuten erneut versuchen." },
});

// API-Endpunkt: Login
router.post("/api/login", loginLimiter, (req, res) => {
  const { email, passwort } = req.body || {};
  const result = authModel.login(email, passwort);
  if (!result.success) return res.status(401).json(result);
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ success: false, message: "Session konnte nicht erstellt werden." });
    req.session.user = result.user;
    res.json({ success: true, user: result.user });
  });
});

// API-Endpunkt: Logout
router.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// API-Endpunkt: Session prüfen (steuert im Frontend, ob die Login-Seite gezeigt wird)
router.get("/api/session", (req, res) => {
  res.json({ loggedIn: Boolean(req.session.user), user: req.session.user || null, kiAktiv: claude.istAktiv() });
});

export default router;

"use strict";

// Nur eingeloggte Benutzer dürfen weiter
export function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Bitte zuerst einloggen." });
  }
  next();
}

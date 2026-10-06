"use strict";

import crypto from "crypto";
import { styleText } from "node:util";
import * as db from "./database.js";

// Passwort-Hashing mit scrypt aus node:crypto (keine native Abhängigkeit wie bcrypt nötig)
export function hashPasswort(passwort) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(passwort, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function pruefePasswort(passwort, gespeichert) {
  const [salt, hash] = String(gespeichert).split(":");
  if (!salt || !hash) return false;
  const vergleich = crypto.scryptSync(passwort, salt, 64);
  return crypto.timingSafeEqual(vergleich, Buffer.from(hash, "hex"));
}

export function login(email, passwort) {
  try {
    if (!email || !passwort) return { success: false, message: "E-Mail und Passwort angeben." };
    const benutzer = db.getBenutzerByEmail(String(email).trim().toLowerCase());
    if (!benutzer || !pruefePasswort(passwort, benutzer.passwort_hash)) {
      return { success: false, message: "E-Mail oder Passwort falsch." };
    }
    return { success: true, user: { id: benutzer.id, email: benutzer.email, name: benutzer.name, rolle: benutzer.rolle } };
  } catch (err) {
    console.error(styleText("red", "Fehler in login: " + err.message));
    return { success: false, message: "Interner Fehler beim Login." };
  }
}

// Legt beim ersten Start den Demo-Benutzer aus der .env an
export function seedDemoBenutzer() {
  if (db.countBenutzer() > 0) return false;
  db.insertBenutzer({
    email: process.env.DEMO_EMAIL.trim().toLowerCase(),
    passwortHash: hashPasswort(process.env.DEMO_PASSWORT),
    name: "Martin Schneider",
    rolle: "objektleiter",
  });
  console.log(styleText("green", `Demo-Benutzer ${process.env.DEMO_EMAIL} angelegt.`));
  return true;
}

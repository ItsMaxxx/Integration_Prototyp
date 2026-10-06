"use strict";

import crypto from "crypto";
import { styleText } from "node:util";
import * as db from "./database.js";
import { mitAmpel, kennzahlen, isoDatum } from "../controller/lib/plan.js";

export function listeMitKennzahlen() {
  const termine = db.getAlleTermine();
  return db.getAlleObjekte().map((objekt) => {
    const eigene = termine.filter((t) => t.objekt_id === objekt.id);
    return { ...objekt, kennzahlen: kennzahlen(eigene) };
  });
}

export function detail(objektId) {
  const objekt = db.getObjektById(objektId);
  if (!objekt) return null;
  const termine = mitAmpel(db.getTermineByObjekt(objektId));
  return {
    ...objekt,
    kennzahlen: kennzahlen(termine),
    positionen: db.getPositionenByObjekt(objektId),
    termine,
    lvDokumente: db.getLvDokumenteByObjekt(objektId),
  };
}

export function anlegen({ name, adresse, auftraggeber, planStart }) {
  try {
    if (!name || !String(name).trim()) return { success: false, message: "Objektname fehlt." };
    const start = planStart && /^\d{4}-\d{2}-\d{2}$/.test(planStart) ? planStart : ersterDesMonats();
    const id = db.insertObjekt({
      name: String(name).trim(),
      adresse: adresse || null,
      auftraggeber: auftraggeber || null,
      planStart: start,
      portalToken: crypto.randomBytes(16).toString("hex"),
    });
    return { success: true, id };
  } catch (err) {
    console.error(styleText("red", "Fehler in objektModel.anlegen: " + err.message));
    return { success: false, message: "Objekt konnte nicht angelegt werden." };
  }
}

function ersterDesMonats() {
  const d = new Date();
  return isoDatum(new Date(d.getFullYear(), d.getMonth(), 1));
}

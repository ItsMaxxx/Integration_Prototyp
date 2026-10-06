"use strict";

import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadRoot = path.resolve(process.env.UPLOAD_DIR);

// Unterordner (lv/, protokolle/) werden bei Bedarf angelegt
function storageFor(unterordner) {
  const ziel = path.join(uploadRoot, unterordner);
  fs.mkdirSync(ziel, { recursive: true });
  return multer.diskStorage({
    destination: ziel,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });
}

const LV_ENDUNGEN = [".pdf", ".xlsx", ".csv", ".txt"];
const PROTOKOLL_ENDUNGEN = [".pdf", ".txt", ".png", ".jpg", ".jpeg"];

function filter(erlaubt) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (erlaubt.includes(ext)) cb(null, true);
    else cb(new Error(`Dateityp ${ext || "?"} nicht erlaubt. Erlaubt: ${erlaubt.join(", ")}`));
  };
}

const limits = { fileSize: 20 * 1024 * 1024 };
// Browser senden Dateinamen als UTF-8 – sonst werden Umlaute als latin1 gelesen
const defParamCharset = "utf8";

export const lvUpload = multer({ storage: storageFor("lv"), fileFilter: filter(LV_ENDUNGEN), limits, defParamCharset });
export const protokollUpload = multer({
  storage: storageFor("protokolle"),
  fileFilter: filter(PROTOKOLL_ENDUNGEN),
  limits,
  defParamCharset,
});

// Express-Middleware-Wrapper: Multer-Fehler als JSON statt als HTML-Fehlerseite
export function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  };
}

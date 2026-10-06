"use strict";

import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";

// Text aus PDF/TXT lesen. Bilder liefern keinen Text (→ nur mit Claude auswertbar).
export async function extrahiereText(dateipfad) {
  const ext = path.extname(dateipfad).toLowerCase();
  if (ext === ".pdf") {
    const parser = new PDFParse({ data: fs.readFileSync(dateipfad) });
    try {
      const ergebnis = await parser.getText();
      return ergebnis.text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (ext === ".txt" || ext === ".csv") {
    return fs.readFileSync(dateipfad, "utf8");
  }
  return "";
}

// Tabellen (XLSX/CSV) als Array von Zeilen (Array von Zellwerten als String)
export async function leseTabelle(dateipfad) {
  const ext = path.extname(dateipfad).toLowerCase();
  if (ext === ".xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(dateipfad);
    const sheet = workbook.worksheets[0];
    const zeilen = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const werte = [];
      for (let i = 1; i <= row.cellCount; i++) werte.push(zellText(row.getCell(i).value));
      zeilen.push(werte);
    });
    return zeilen;
  }
  if (ext === ".csv") {
    return parseCsv(fs.readFileSync(dateipfad, "utf8"));
  }
  return null;
}

function zellText(wert) {
  if (wert === null || wert === undefined) return "";
  if (typeof wert === "object") {
    if (wert.richText) return wert.richText.map((r) => r.text).join("");
    if (wert.result !== undefined) return String(wert.result);
    if (wert.text) return String(wert.text);
    if (wert instanceof Date) return wert.toISOString().slice(0, 10);
  }
  return String(wert).trim();
}

// Einfacher CSV-Parser: erkennt ; oder , als Trenner und Anführungszeichen
export function parseCsv(inhalt) {
  const text = inhalt.replace(/^﻿/, "");
  const ersteZeile = text.split(/\r?\n/)[0] || "";
  const trenner = (ersteZeile.match(/;/g) || []).length >= (ersteZeile.match(/,/g) || []).length ? ";" : ",";
  const zeilen = [];
  let zeile = [];
  let feld = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        feld += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else feld += c;
    } else if (c === '"') inQuotes = true;
    else if (c === trenner) {
      zeile.push(feld.trim());
      feld = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      zeile.push(feld.trim());
      if (zeile.some((f) => f !== "")) zeilen.push(zeile);
      zeile = [];
      feld = "";
    } else feld += c;
  }
  zeile.push(feld.trim());
  if (zeile.some((f) => f !== "")) zeilen.push(zeile);
  return zeilen;
}

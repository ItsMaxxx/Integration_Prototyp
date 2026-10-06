"use strict";

import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { styleText } from "node:util";

// Optionale KI-Unterstützung über Claude.
// Ohne ANTHROPIC_API_KEY liefert istAktiv() false und alle Aufrufer nutzen die regelbasierte Variante.
// Bei jedem Fehler wird null zurückgegeben → Aufrufer fällt auf die Regeln zurück.

const MODELL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

let client = null;
export function istAktiv() {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

// Bei einer Ablehnung durch die Sicherheitsfilter springt serverseitig automatisch ein Ersatzmodell ein
const FALLBACK_OPTIONEN = { headers: { "anthropic-beta": "server-side-fallback-2026-07-01" } };

// Datei als Content-Block: PDF → document, Bild → image (für gescannte Unterlagen ohne Textebene)
function dateiBlock(dateipfad) {
  const ext = path.extname(dateipfad).toLowerCase();
  const data = fs.readFileSync(dateipfad).toString("base64");
  if (ext === ".pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data } };
  const bildTypen = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
  if (bildTypen[ext]) return { type: "image", source: { type: "base64", media_type: bildTypen[ext], data } };
  return null;
}

async function frage({ system, inhalt, schema }) {
  const response = await getClient().messages.parse(
    {
      model: MODELL,
      max_tokens: 16000,
      fallbacks: "default",
      output_config: { effort: "medium", format: zodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: inhalt }],
    },
    FALLBACK_OPTIONEN,
  );
  if (response.stop_reason === "refusal") {
    console.error(styleText("yellow", "Claude hat die Anfrage abgelehnt – regelbasierter Fallback."));
    return null;
  }
  if (response.stop_reason === "max_tokens") {
    console.error(styleText("yellow", "Claude-Antwort abgeschnitten (max_tokens) – regelbasierter Fallback."));
    return null;
  }
  return response.parsed_output ?? null;
}

// ---------------------------------------------------------------------------
// Baustein 1: LV-Ingestion
// ---------------------------------------------------------------------------

const LvSchema = z.object({
  positionen: z.array(
    z.object({
      pos_nr: z.string().nullable(),
      anlage: z.string(),
      gewerk: z.string().nullable(),
      leistung: z.string().nullable(),
      norm: z.string().nullable(),
      zyklus_monate: z.number().int(),
      preis: z.number().nullable(),
      verantwortung: z.enum(["intern", "extern"]),
    }),
  ),
});

export async function extrahiereLv({ dateipfad, text }) {
  if (!istAktiv()) return null;
  try {
    const inhalt = [];
    const block = !text || text.trim().length < 50 ? dateiBlock(dateipfad) : null;
    if (block) inhalt.push(block);
    else inhalt.push({ type: "text", text: `<leistungsverzeichnis>\n${text}\n</leistungsverzeichnis>` });
    inhalt.push({
      type: "text",
      text:
        "Extrahiere alle wiederkehrenden Wartungs-, Inspektions- und Prüfpflichten aus diesem Leistungsverzeichnis. " +
        "Eine Position je Pflicht. zyklus_monate: Intervall in Monaten (monatlich=1, vierteljährlich=3, halbjährlich=6, " +
        "jährlich=12, zweijährlich=24). norm: Norm oder Rechtsgrundlage, falls genannt. preis: Einheitspreis je Durchführung in Euro. " +
        "verantwortung: 'extern', wenn ein Nachunternehmer/eine Fachfirma/ein Sachverständiger genannt ist, sonst 'intern'. " +
        "Überschriften, Vorbemerkungen und einmalige Leistungen weglassen.",
    });
    const ergebnis = await frage({
      system: "Du bist Experte für technisches Facility Management und Leistungsverzeichnisse im deutschen Raum.",
      inhalt,
      schema: LvSchema,
    });
    return ergebnis ? ergebnis.positionen : null;
  } catch (err) {
    console.error(styleText("red", "Claude-LV-Extraktion fehlgeschlagen: " + err.message));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Baustein 4: Protokoll-Zuordnung + Mängel
// ---------------------------------------------------------------------------

const ProtokollSchema = z.object({
  termin_id: z.number().int().nullable(),
  konfidenz: z.number(),
  durchfuehrung_am: z.string().nullable(),
  maengel: z.array(z.string()),
  begruendung: z.string(),
});

export async function analysiereProtokoll({ dateipfad, text, kandidaten }) {
  if (!istAktiv() || kandidaten.length === 0) return null;
  try {
    const inhalt = [];
    const block = !text || text.trim().length < 50 ? dateiBlock(dateipfad) : null;
    if (block) inhalt.push(block);
    else inhalt.push({ type: "text", text: `<protokoll>\n${text}\n</protokoll>` });

    const liste = kandidaten
      .map(
        (t) =>
          `- termin_id=${t.id} | Pos ${t.pos_nr || "-"} | ${t.anlage} | ${t.leistung || ""} | Norm: ${t.norm || "-"} | Frist: ${t.faellig_am}`,
      )
      .join("\n");
    inhalt.push({
      type: "text",
      text:
        `Offene Wartungstermine dieses Objekts:\n${liste}\n\n` +
        "Ordne das Wartungsprotokoll genau einem offenen Termin zu: gleiche Anlage und Leistung, und bei mehreren Terminen derselben " +
        "Position der, dessen Frist am besten zum Durchführungsdatum passt. Ist keine Zuordnung belastbar, gib termin_id=null. " +
        "konfidenz zwischen 0 und 1 – nur ≥ 0.8, wenn Anlage und Leistung eindeutig übereinstimmen. " +
        "durchfuehrung_am im Format YYYY-MM-DD. maengel: jeder im Protokoll festgestellte Mangel als kurzer Satz (leer, wenn keine).",
    });
    const ergebnis = await frage({
      system: "Du prüfst Wartungsprotokolle im technischen Facility Management und ordnest sie Wartungspflichten zu.",
      inhalt,
      schema: ProtokollSchema,
    });
    if (!ergebnis) return null;
    // Nur IDs akzeptieren, die tatsächlich zur Auswahl standen
    if (ergebnis.termin_id !== null && !kandidaten.some((k) => k.id === ergebnis.termin_id)) ergebnis.termin_id = null;
    ergebnis.konfidenz = Math.max(0, Math.min(1, ergebnis.konfidenz));
    return ergebnis;
  } catch (err) {
    console.error(styleText("red", "Claude-Protokollanalyse fehlgeschlagen: " + err.message));
    return null;
  }
}

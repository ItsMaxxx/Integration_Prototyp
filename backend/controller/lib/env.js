"use strict";

import { styleText } from "node:util";

// Überprüft, ob alle benötigten ENV-Variablen gesetzt sind
// ANTHROPIC_API_KEY ist bewusst optional – ohne Key läuft alles regelbasiert
export function checkAllEnv() {
  const requiredEnvVars = ["APP_PORT", "SESSION_SECRET", "DB_PATH", "UPLOAD_DIR", "DEMO_EMAIL", "DEMO_PASSWORT"];

  const missingEnvVars = requiredEnvVars.filter((envName) => {
    const value = process.env[envName];
    return value === undefined || value === null || value.trim() === "";
  });

  if (missingEnvVars.length > 0) {
    console.error(styleText("red", `Fehlende ENV-Variablen: ${missingEnvVars.join(", ")}`));
    return true;
  }

  return false;
}

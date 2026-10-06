"use strict";

import * as db from "./database.js";
import { berechneFaelligkeiten } from "../controller/lib/plan.js";

// Erzeugt den Jahresplan einer Position. versatz verteilt Jahreswartungen über das Jahr.
export function erzeugeTermine(positionId, planStart, zyklusMonate, versatz) {
  const faelligkeiten = berechneFaelligkeiten(planStart, zyklusMonate, versatz);
  return faelligkeiten.map((faelligAm) => db.insertTermin(positionId, faelligAm));
}

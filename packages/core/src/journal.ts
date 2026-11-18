// Journaux structurés (pino, format JSON). Règle : aucune donnée d'identité.
// On masque par sécurité les champs qui pourraient en contenir s'ils étaient passés par erreur.
import pino from "pino";

export type Journal = pino.Logger;

const CHAMPS_MASQUES = [
  "telegramId",
  "prenom",
  "ville",
  "texte",
  "email",
  "contact",
  "motDePasse",
  "token",
  "*.telegramId",
  "*.prenom",
  "*.ville",
  "*.texte",
  "*.email",
  "*.motDePasse",
  "*.token",
];

/** Crée le journal racine d'un service ("bot", "web", "taches"...). */
export function creerJournal(service: string, niveau = process.env.LOG_LEVEL ?? "info"): Journal {
  return pino({
    level: niveau,
    base: { service },
    redact: { paths: CHAMPS_MASQUES, censor: "[masque]" },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/** Journal silencieux, utile dans les tests. */
export const journalSilencieux: Journal = pino({ level: "silent" });

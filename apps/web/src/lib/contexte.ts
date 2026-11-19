// Contexte du noyau métier pour le site. Le site n'appelle jamais l'IA :
// le fournisseur fourni ici lève une erreur si une règle tentait de l'utiliser.
import "server-only";
import {
  creerJournal,
  horlogeSysteme,
  type Contexte,
  type FournisseurIA,
  type Journal,
} from "@sentya/core";
import { getPrisma } from "@sentya/db";
import { env } from "@/env";

const iaIndisponible: FournisseurIA = {
  modele: "aucun",
  genererJson() {
    throw new Error("IA non disponible dans le web");
  },
  synthetiserVoix() {
    throw new Error("IA non disponible dans le web");
  },
};

let journal: Journal | undefined;

/** Journal pino du service "web" (aucune donnée d'identité). */
export function journalWeb(): Journal {
  journal ??= creerJournal("web");
  return journal;
}

export function contexteWeb(): Contexte {
  const config = env();
  return {
    prisma: getPrisma(),
    ia: iaIndisponible,
    horloge: horlogeSysteme,
    journal: journalWeb(),
    sel: config.HASH_SALT ?? "",
    appUrl: config.APP_URL,
  };
}

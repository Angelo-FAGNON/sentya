// Normalisation déterministe des réponses "niveau d'études" et "objectif" (sans IA).
import type { NiveauEtudes, Objectif, Voie } from "@sentya/db";
import { normaliser } from "../texte";

const REGLES_NIVEAU: [RegExp, NiveauEtudes][] = [
  [
    /pas de diplome|aucun diplome|sans diplome|jamais ete a l'ecole|pas ete a l'ecole|non scolaris|aucun/,
    "AUCUN_DIPLOME",
  ],
  [
    /licence|master|bts|dut|bac ?\+|universit|fac\b|faculte|doctorat|ingenieur|superieur/,
    "SUPERIEUR",
  ],
  [
    /\bcap\b|\bcqp\b|\bcqm\b|certificat|brevet professionnel|\bbt\b|\bbep\b|\bdti\b|technique/,
    "CERTIFICAT_PRO",
  ],
  [/\bbac\b|baccalaureat|terminale/, "BAC"],
  [/bepc|\b3e\b|troisieme|seconde|premiere|college|lycee|secondaire/, "SECONDAIRE"],
  [/\bcep\b|primaire|cm2|cm1|ce1|ce2|cours moyen/, "PRIMAIRE"],
];

export function normaliserNiveauEtudes(reponse: string): NiveauEtudes {
  const n = normaliser(reponse);
  for (const [motif, niveau] of REGLES_NIVEAU) {
    if (motif.test(n)) return niveau;
  }
  return "AUTRE";
}

const REGLES_OBJECTIF: [RegExp, Objectif][] = [
  [/sais pas|aucune idee|hesite|pas encore|je ne sais|sais plus/, "NE_SAIT_PAS"],
  [
    /propre|a mon compte|mon compte|entreprise|business|atelier|ma boutique|mon commerce|patron de|installer|independant/,
    "PROPRE_ACTIVITE",
  ],
  [/formation|apprendre|etudier|diplome|certif|ecole|stage/, "FORMATION"],
  [/emploi|travail|job|boulot|embauche|salaire|travailler|poste/, "EMPLOI"],
];

export function normaliserObjectif(reponse: string): Objectif {
  const n = normaliser(reponse);
  for (const [motif, objectif] of REGLES_OBJECTIF) {
    if (motif.test(n)) return objectif;
  }
  return "NE_SAIT_PAS";
}

/** Voie privilégiée selon l'objectif déclaré. */
export function voiePreferee(objectif: Objectif | null): Voie | null {
  switch (objectif) {
    case "EMPLOI":
      return "EMPLOI";
    case "FORMATION":
      return "FORMATION_CERTIFICATION";
    case "PROPRE_ACTIVITE":
      return "AUTO_EMPLOI";
    default:
      return null;
  }
}

export const ORDRE_VOIES: Voie[] = ["EMPLOI", "FORMATION_CERTIFICATION", "AUTO_EMPLOI"];

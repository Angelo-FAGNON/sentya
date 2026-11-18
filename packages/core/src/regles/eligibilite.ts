// Statuts qui rendent une fiche proposable au jeune (hypothèses H1 et H2).
import type { Statut } from "@sentya/db";

/**
 * Métiers, formations, programmes et modèles d'étapes : VERIFIEE ou A_VERIFIER.
 * Une fiche A_VERIFIER est affichée avec la mention "à vérifier".
 */
export const STATUTS_REFERENTIEL_ELIGIBLES: Statut[] = ["VERIFIEE", "A_VERIFIER"];

/** Opportunités : uniquement VERIFIEE (EF-09, RG-05). */
export const STATUT_OPPORTUNITE_VISIBLE: Statut = "VERIFIEE";

export function estEligibleReferentiel(statut: Statut): boolean {
  return STATUTS_REFERENTIEL_ELIGIBLES.includes(statut);
}

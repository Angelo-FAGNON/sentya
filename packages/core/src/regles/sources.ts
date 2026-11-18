// RG-04 : toute information affichée montre sa source et sa date de vérification.
import type { Statut } from "@sentya/db";
import { formaterDate } from "../dates";
import { A_VERIFIER_PAR_CURATEUR, fr } from "../messages/fr";

export interface FicheSourcee {
  sourceUrl: string;
  verifieLe: Date | null;
  statut: Statut;
}

/** Nom de domaine lisible ("sica.anpe.bj") à partir de l'URL de la source. */
export function domaineSource(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "vérifiée le 12/03/2026" ou "à vérifier". */
export function etatVerification(fiche: Pick<FicheSourcee, "verifieLe" | "statut">): string {
  if (fiche.statut === "VERIFIEE" && fiche.verifieLe) {
    return fr.verifieeLe(formaterDate(fiche.verifieLe)).toLowerCase();
  }
  return fr.aVerifier;
}

/** Ligne "Source : domaine, vérifiée le JJ/MM/AAAA". */
export function mentionSource(fiche: FicheSourcee): string {
  return fr.source(domaineSource(fiche.sourceUrl), etatVerification(fiche));
}

/** Coût en FCFA avec séparateur de milliers, ou la mention imposée s'il est inconnu. */
export function formaterCout(coutFcfa: number | null): string {
  if (coutFcfa === null) return A_VERIFIER_PAR_CURATEUR;
  return `${String(coutFcfa).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

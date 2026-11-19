// Règles communes aux fiches du référentiel (RG-04) : statut et date de vérification.
import type { Statut } from "@sentya/db";

/**
 * Calcule le statut et la date à enregistrer.
 * - Case « vérifiée aujourd'hui » cochée : VERIFIEE et date du jour.
 * - Statut VERIFIEE sans date : la date du jour est posée (une fiche vérifiée a toujours une date).
 */
export function statutEtVerification(
  saisie: { statut: Statut; verifieLe: Date | null; verifieeAujourdhui: boolean },
  maintenant: Date,
): { statut: Statut; verifieLe: Date | null } {
  if (saisie.verifieeAujourdhui) return { statut: "VERIFIEE", verifieLe: maintenant };
  if (saisie.statut === "VERIFIEE" && !saisie.verifieLe) {
    return { statut: "VERIFIEE", verifieLe: maintenant };
  }
  return { statut: saisie.statut, verifieLe: saisie.verifieLe };
}

/** Date au format du champ HTML (AAAA-MM-JJ), à l'heure du Bénin et du Togo (UTC+1). */
export function versChampDate(date: Date | null | undefined): string {
  if (!date) return "";
  const locale = new Date(date.getTime() + 60 * 60 * 1000);
  return locale.toISOString().slice(0, 10);
}

/** Erreur Prisma de clé étrangère (suppression bloquée par une ligne qui référence la fiche). */
export function estErreurReference(erreur: unknown): boolean {
  const code = (erreur as { code?: unknown } | null)?.code;
  return code === "P2003" || code === "P2014";
}

/** Erreur Prisma d'unicité (identifiant ou e-mail déjà utilisé). */
export function estErreurUnicite(erreur: unknown): boolean {
  return (erreur as { code?: unknown } | null)?.code === "P2002";
}

/** Explication lisible d'un refus d'opportunité : frais ou paiement demandés au candidat (RG-05). */
export function messageRefus(analyse: { motifs: { description: string }[] }): string {
  const motifs = analyse.motifs.map((m) => m.description).join(", ");
  return `Offre refusée : elle demande de l'argent au candidat (${motifs}). Une offre qui demande des frais ne peut pas être publiée sur Sentya.`;
}

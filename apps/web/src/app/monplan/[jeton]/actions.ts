"use server";
// Consommation du lien magique (EF-11) : uniquement sur action explicite (POST), jamais en GET,
// car les aperçus de liens de Telegram chargent les adresses envoyées.
import {
  consommerLienMagique,
  formaterDate,
  mentionSource,
  planActif,
  STATUT_ETAPE_LIBELLE,
  VOIE_LIBELLE,
} from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { EtatPlan } from "./etat";

export async function consulterPlan(_etat: EtatPlan, formData: FormData): Promise<EtatPlan> {
  const jeton = formData.get("jeton");
  if (typeof jeton !== "string" || jeton.length < 20 || jeton.length > 200) {
    return { statut: "expire" };
  }
  const prisma = getPrisma();
  const userId = await consommerLienMagique(prisma, jeton, new Date());
  if (!userId) return { statut: "expire" };

  const plan = await planActif(prisma, userId);
  if (!plan) return { statut: "sans_plan" };
  return {
    statut: "plan",
    metier: plan.piste.metier.libelle,
    voie: VOIE_LIBELLE[plan.piste.voie],
    etapes: plan.etapes.map((etape) => ({
      ordre: etape.ordre,
      titre: etape.titre,
      details: etape.details,
      echeance: formaterDate(etape.echeance),
      statut: STATUT_ETAPE_LIBELLE[etape.statut],
      source: mentionSource({
        sourceUrl: etape.sourceUrl,
        verifieLe: etape.verifieLe,
        statut: etape.verifieLe ? "VERIFIEE" : "A_VERIFIER",
      }),
    })),
  };
}

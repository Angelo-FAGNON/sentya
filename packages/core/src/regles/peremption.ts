// RG-04 : toute fiche vérifiée depuis plus de 6 mois repasse à A_VERIFIER (tâche quotidienne).
import type { ClientBase } from "../contexte";
import { retirerMois } from "../horloge";

export const MOIS_AVANT_PEREMPTION = 6;

export function estPerimee(
  fiche: { statut: string; verifieLe: Date | null },
  maintenant: Date,
): boolean {
  return (
    fiche.statut === "VERIFIEE" &&
    (!fiche.verifieLe || fiche.verifieLe < retirerMois(maintenant, MOIS_AVANT_PEREMPTION))
  );
}

/** Passe à A_VERIFIER toutes les fiches périmées. Renvoie le nombre de fiches par table. */
export async function marquerFichesPerimees(prisma: ClientBase, maintenant: Date) {
  const limite = retirerMois(maintenant, MOIS_AVANT_PEREMPTION);
  const filtre = {
    where: {
      statut: "VERIFIEE" as const,
      OR: [{ verifieLe: null }, { verifieLe: { lt: limite } }],
    },
    data: { statut: "A_VERIFIER" as const },
  };
  const [metiers, formations, programmes, opportunites, modeles] = await Promise.all([
    prisma.metier.updateMany(filtre),
    prisma.formation.updateMany(filtre),
    prisma.programme.updateMany(filtre),
    prisma.opportunite.updateMany(filtre),
    prisma.modeleEtape.updateMany(filtre),
  ]);
  return {
    metiers: metiers.count,
    formations: formations.count,
    programmes: programmes.count,
    opportunites: opportunites.count,
    modeles: modeles.count,
  };
}

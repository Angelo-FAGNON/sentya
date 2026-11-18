// RG-11 : /supprimer efface réellement toutes les données du jeune (suppression en cascade).
// Les tables d'analyse gardent les chiffres, mais le lien avec la personne est rompu (H6).
import type { PrismaClient } from "@sentya/db";
import type { ClientBase } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { hachageAleatoire } from "../confidentialite/hachage";

/** Remplace un hachage par une valeur aléatoire dans les tables d'analyse. */
export async function romprelienAnalytique(
  prisma: ClientBase,
  ancienHash: string,
): Promise<string> {
  const nouveau = hachageAleatoire();
  await prisma.evenementAnalytique.updateMany({
    where: { userHash: ancienHash },
    data: { userHash: nouveau },
  });
  await prisma.recommandationLog.updateMany({
    where: { userHash: ancienHash },
    data: { userHash: nouveau },
  });
  await prisma.revueQualite.deleteMany({ where: { userHash: ancienHash } });
  return nouveau;
}

/**
 * Supprime le jeune et toutes ses données. Le compteur de signalements des opportunités
 * n'est pas modifié (H7). Renvoie false si le jeune n'existait pas.
 */
export async function supprimerUtilisateur(
  prisma: PrismaClient,
  userId: string,
  maintenant: Date,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { userHash: true, canal: true },
    });
    if (!user) return false;
    await romprelienAnalytique(tx, user.userHash);
    await tx.user.delete({ where: { id: userId } });
    await enregistrerEvenement(tx, {
      type: EVENEMENTS.COMPTE_SUPPRIME,
      canal: user.canal,
      date: maintenant,
    });
    return true;
  });
}

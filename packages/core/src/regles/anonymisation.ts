// RG-12 : après 12 mois d'inactivité, le profil est anonymisé (tâche quotidienne).
// On supprime le contenu personnel, on rompt les hachages, on garde les pistes et plans
// (sans lien avec une personne) pour les indicateurs.
import type { PrismaClient } from "@sentya/db";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { retirerMois } from "../horloge";
import { romprelienAnalytique } from "./suppression";

export const MOIS_AVANT_ANONYMISATION = 12;

export async function anonymiserInactifs(prisma: PrismaClient, maintenant: Date): Promise<number> {
  const limite = retirerMois(maintenant, MOIS_AVANT_ANONYMISATION);
  const inactifs = await prisma.user.findMany({
    where: { lastActiveAt: { lt: limite }, anonymiseLe: null },
    select: { id: true, userHash: true },
    take: 500,
  });

  for (const user of inactifs) {
    await prisma.$transaction(async (tx) => {
      await tx.conversationState.deleteMany({ where: { userId: user.id } });
      await tx.bilanReponse.deleteMany({ where: { userId: user.id } });
      await tx.userCompetence.deleteMany({ where: { userId: user.id } });
      await tx.magicLink.deleteMany({ where: { userId: user.id } });
      await tx.candidature.deleteMany({ where: { userId: user.id } });
      const plans = await tx.plan.findMany({ where: { userId: user.id }, select: { id: true } });
      const planIds = plans.map((p) => p.id);
      await tx.rappel.deleteMany({ where: { planId: { in: planIds }, envoyeLe: null } });
      await tx.plan.updateMany({ where: { id: { in: planIds } }, data: { actif: false } });
      await tx.planEtape.updateMany({ where: { planId: { in: planIds } }, data: { raison: null } });
      const nouveauHash = await romprelienAnalytique(tx, user.userHash);
      await tx.user.update({
        where: { id: user.id },
        data: {
          telegramId: null,
          prenom: null,
          ville: null,
          userHash: nouveauHash,
          sourceAcquisition: null,
          audioReplies: false,
          anonymiseLe: maintenant,
        },
      });
      await enregistrerEvenement(tx, { type: EVENEMENTS.PROFIL_ANONYMISE, date: maintenant });
    });
  }
  return inactifs.length;
}

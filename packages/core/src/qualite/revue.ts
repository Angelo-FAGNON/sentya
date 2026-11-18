// Revue qualité (EF-12) : chaque semaine, 50 recommandations tirées au sort sont
// présentées sous forme pseudonymisée aux relecteurs, qui notent leur qualité.
import type { Prisma } from "@sentya/db";
import type { ClientBase } from "../contexte";
import { pseudonymiser } from "../confidentialite/pseudonymisation";
import { semaineIso } from "../dates";
import { ajouterJours } from "../horloge";

export const TAILLE_ECHANTILLON = 50;

/** Mélange de Fisher-Yates avec un générateur fourni (déterministe dans les tests). */
function melanger<T>(liste: T[], aleatoire: () => number): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatoire() * (i + 1));
    [copie[i], copie[j]] = [copie[j] as T, copie[i] as T];
  }
  return copie;
}

/** Crée l'échantillon de la semaine s'il n'existe pas encore. Renvoie le nombre créé. */
export async function echantillonnerRevue(
  prisma: ClientBase,
  maintenant: Date,
  aleatoire: () => number = Math.random,
  taille = TAILLE_ECHANTILLON,
): Promise<number> {
  const semaine = semaineIso(maintenant);
  if ((await prisma.revueQualite.count({ where: { semaine } })) > 0) return 0;

  const recommandations = await prisma.recommandationLog.findMany({
    where: { createdAt: { gte: ajouterJours(maintenant, -7), lte: maintenant } },
  });
  const choisies = melanger(recommandations, aleatoire).slice(0, taille);
  let crees = 0;

  for (const reco of choisies) {
    const user = await prisma.user.findUnique({
      where: { userHash: reco.userHash },
      select: { id: true, prenom: true, reponses: { orderBy: { createdAt: "asc" } } },
    });
    if (!user) continue;
    const pistes = await prisma.piste.findMany({
      where: { lotId: reco.lotId },
      include: { metier: { select: { libelle: true } } },
      orderBy: { rang: "asc" },
    });
    const competences = await prisma.userCompetence.findMany({
      where: { userId: user.id },
      include: { competence: { select: { libelle: true } } },
    });
    const conversation: Prisma.InputJsonValue = {
      pays: reco.pays,
      reponses: user.reponses.map((r) => ({
        question: r.question,
        texte: pseudonymiser(r.texte, { nomsConnus: [user.prenom] }),
      })),
      competences: competences.map((c) => c.competence.libelle),
      candidats: reco.metierIdsCandidats,
      idsRejetes: reco.idsRejetes,
      pistes: pistes.map((p) => ({
        rang: p.rang,
        metier: p.metier.libelle,
        metierId: p.metierId,
        voie: p.voie,
        raison: p.raison,
        condition: p.conditionPrincipale,
        aExplorer: p.aExplorer,
      })),
      promptVersion: reco.promptVersion,
    };
    await prisma.revueQualite.create({
      data: {
        semaine,
        userHash: reco.userHash,
        recommandationId: reco.id,
        conversationAnonymisee: conversation,
        createdAt: maintenant,
      },
    });
    crees += 1;
  }
  return crees;
}

/** Enregistre la notation d'un relecteur. */
export async function noterRevue(
  prisma: ClientBase,
  entree: {
    revueId: string;
    relecteurId: string;
    pistesCorrectes: boolean;
    inventionDetectee: boolean;
    commentaire?: string;
  },
  maintenant: Date,
) {
  return prisma.revueQualite.update({
    where: { id: entree.revueId },
    data: {
      pistesCorrectes: entree.pistesCorrectes,
      inventionDetectee: entree.inventionDetectee,
      commentaire: entree.commentaire?.slice(0, 1000) || null,
      relecteurId: entree.relecteurId,
      noteeLe: maintenant,
    },
  });
}

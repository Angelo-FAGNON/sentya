// RG-07 : le profil n'est partagé avec un partenaire qu'après accord explicite du jeune,
// pour une opportunité précise. Le partenaire ne voit que les candidatures reçues.
import type { ClientBase, Contexte } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { STATUT_OPPORTUNITE_VISIBLE } from "./eligibilite";

export class CandidatureImpossibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CandidatureImpossibleError";
  }
}

/** Crée la candidature. L'accord doit être la valeur littérale true (bouton explicite). */
export async function postuler(
  ctx: Contexte,
  entree: { userId: string; opportuniteId: string; accordExplicite: true },
) {
  if (entree.accordExplicite !== true) {
    throw new CandidatureImpossibleError("Accord explicite requis pour partager le profil.");
  }
  const opportunite = await ctx.prisma.opportunite.findUnique({
    where: { id: entree.opportuniteId },
    include: { partenaire: true },
  });
  if (!opportunite || opportunite.statut !== STATUT_OPPORTUNITE_VISIBLE) {
    throw new CandidatureImpossibleError("Opportunite indisponible.");
  }
  if (!opportunite.partenaire || opportunite.partenaire.statutValidation !== "VALIDE") {
    throw new CandidatureImpossibleError(
      "Cette opportunite ne recoit pas de candidature par Sentya.",
    );
  }
  const maintenant = ctx.horloge.maintenant();
  const candidature = await ctx.prisma.candidature.upsert({
    where: { userId_opportuniteId: { userId: entree.userId, opportuniteId: entree.opportuniteId } },
    create: {
      userId: entree.userId,
      opportuniteId: entree.opportuniteId,
      consentAt: maintenant,
      createdAt: maintenant,
    },
    update: {},
  });
  await enregistrerEvenement(ctx.prisma, {
    type: EVENEMENTS.CANDIDATURE,
    payload: { opportuniteId: entree.opportuniteId },
    date: maintenant,
  });
  return candidature;
}

/**
 * Candidatures visibles par un partenaire : seulement celles reçues sur SES opportunités,
 * avec le strict nécessaire du profil (pas d'identifiant Telegram, pas de bilan brut).
 */
export async function candidaturesDuPartenaire(prisma: ClientBase, partenaireId: string) {
  const candidatures = await prisma.candidature.findMany({
    where: { opportunite: { partenaireId } },
    include: {
      opportunite: { select: { id: true, titre: true } },
      user: {
        select: {
          prenom: true,
          ville: true,
          niveauEtudes: true,
          competences: {
            where: { validee: true },
            include: { competence: { select: { libelle: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return candidatures.map((c) => ({
    id: c.id,
    statut: c.statut,
    consentAt: c.consentAt,
    opportunite: c.opportunite,
    profil: {
      prenom: c.user.prenom,
      ville: c.user.ville,
      niveauEtudes: c.user.niveauEtudes,
      competences: c.user.competences.map((uc) => uc.competence.libelle),
    },
  }));
}

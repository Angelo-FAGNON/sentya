// EF-10, RG-05, RG-06 : détection des signaux de fraude, vérification par un curateur,
// signalements et suspension automatique.
import type { CategorieFraude, Prisma, RegleFraude } from "@sentya/db";
import type { ClientBase, Contexte } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { ajouterJours } from "../horloge";
import { contientTerme, normaliser } from "../texte";

/** RG-06 : nombre de signalements indépendants qui suspend une opportunité. */
export const SEUIL_SUSPENSION = 3;
/** RG-06 : délai de revue humaine attendu après une suspension. */
export const DELAI_REVUE_HEURES = 48;

export interface ResultatAnalyse {
  alerte: boolean;
  /** Vrai si une règle bloquante est déclenchée : l'offre est refusée (RG-05). */
  bloquante: boolean;
  motifs: { regleId: string; categorie: CategorieFraude; description: string }[];
}

type RegleAppliquable = Pick<
  RegleFraude,
  "id" | "motif" | "typeMotif" | "categorie" | "description" | "bloquante" | "actif"
>;

/** Applique les règles actives au texte d'une offre (normalisé : minuscules, sans accents). */
export function analyserTexteOffre(texte: string, regles: RegleAppliquable[]): ResultatAnalyse {
  const n = normaliser(texte);
  const motifs: ResultatAnalyse["motifs"] = [];
  let bloquante = false;

  for (const regle of regles) {
    if (!regle.actif) continue;
    let declenchee: boolean;
    if (regle.typeMotif === "MOT_CLE") {
      declenchee = contientTerme(n, regle.motif);
    } else {
      try {
        declenchee = new RegExp(regle.motif, "iu").test(n);
      } catch {
        // Une expression invalide saisie dans le back-office est ignorée, jamais bloquante.
        declenchee = false;
      }
    }
    if (declenchee) {
      motifs.push({
        regleId: regle.id,
        categorie: regle.categorie,
        description: regle.description,
      });
      bloquante ||= regle.bloquante;
    }
  }
  return { alerte: motifs.length > 0, bloquante, motifs };
}

export async function analyserOffre(
  prisma: ClientBase,
  offre: { titre: string; description: string; contact: string },
) {
  const regles = await prisma.regleFraude.findMany({ where: { actif: true } });
  return analyserTexteOffre(`${offre.titre}\n${offre.description}\n${offre.contact}`, regles);
}

export class OffreRefuseeError extends Error {
  constructor(readonly analyse: ResultatAnalyse) {
    super("Offre refusee : elle demande des frais au candidat ou un paiement.");
    this.name = "OffreRefuseeError";
  }
}

/**
 * Soumission d'une opportunité (partenaire ou curateur). Elle arrive toujours en BROUILLON
 * (RG-05) avec le résultat de l'analyse. Une offre qui déclenche une règle bloquante est refusée.
 */
export async function soumettreOpportunite(
  prisma: ClientBase,
  donnees: Omit<
    Prisma.OpportuniteUncheckedCreateInput,
    "statut" | "verifieLe" | "alerteFraude" | "motifsAlerte" | "nbSignalements"
  >,
) {
  const analyse = await analyserOffre(prisma, donnees);
  if (analyse.bloquante) throw new OffreRefuseeError(analyse);
  return prisma.opportunite.create({
    data: {
      ...donnees,
      statut: "BROUILLON",
      verifieLe: null,
      alerteFraude: analyse.alerte,
      motifsAlerte: analyse.motifs.map((m) => m.description),
    },
  });
}

/**
 * RG-05 : seul un curateur passe une opportunité à VERIFIEE, ce qui fixe la date de vérification.
 * L'analyse est refaite : une offre qui demande des frais ne peut jamais être vérifiée.
 */
export async function verifierOpportunite(ctx: Contexte, opportuniteId: string) {
  const opportunite = await ctx.prisma.opportunite.findUniqueOrThrow({
    where: { id: opportuniteId },
  });
  const analyse = await analyserOffre(ctx.prisma, opportunite);
  if (analyse.bloquante) throw new OffreRefuseeError(analyse);
  return ctx.prisma.opportunite.update({
    where: { id: opportuniteId },
    data: {
      statut: "VERIFIEE",
      verifieLe: ctx.horloge.maintenant(),
      alerteFraude: analyse.alerte,
      motifsAlerte: analyse.motifs.map((m) => m.description),
      suspendueLe: null,
    },
  });
}

export type ResultatSignalement = "ENREGISTRE" | "DEJA_SIGNALE" | "SUSPENDUE";

/**
 * RG-06 : un jeune signale une opportunité. Au 3e signalement indépendant, elle est suspendue
 * immédiatement et disparaît des propositions. Opérations atomiques : sûres en concurrence.
 */
export async function signalerOpportunite(
  ctx: Contexte,
  entree: { opportuniteId: string; userId: string; motif: string },
): Promise<ResultatSignalement> {
  const maintenant = ctx.horloge.maintenant();
  return ctx.prisma.$transaction(async (tx) => {
    const deja = await tx.signalement.findUnique({
      where: {
        opportuniteId_userId: { opportuniteId: entree.opportuniteId, userId: entree.userId },
      },
    });
    if (deja) return "DEJA_SIGNALE";

    await tx.signalement.create({
      data: {
        opportuniteId: entree.opportuniteId,
        userId: entree.userId,
        motif: entree.motif.trim().slice(0, 500),
        createdAt: maintenant,
      },
    });
    const { nbSignalements } = await tx.opportunite.update({
      where: { id: entree.opportuniteId },
      data: { nbSignalements: { increment: 1 } },
      select: { nbSignalements: true },
    });
    await enregistrerEvenement(tx, {
      type: EVENEMENTS.SIGNALEMENT,
      payload: { opportuniteId: entree.opportuniteId },
      date: maintenant,
    });

    if (nbSignalements >= SEUIL_SUSPENSION) {
      const suspendue = await tx.opportunite.updateMany({
        where: { id: entree.opportuniteId, statut: { not: "SUSPENDUE" } },
        data: { statut: "SUSPENDUE", suspendueLe: maintenant, revueLe: null },
      });
      if (suspendue.count > 0) {
        await enregistrerEvenement(tx, {
          type: EVENEMENTS.OPPORTUNITE_SUSPENDUE,
          payload: { opportuniteId: entree.opportuniteId, nbSignalements },
          date: maintenant,
        });
        return "SUSPENDUE";
      }
    }
    return "ENREGISTRE";
  });
}

/** File des signalements : opportunités suspendues ou signalées, à traiter. */
export async function fileSignalements(prisma: ClientBase, maintenant: Date) {
  const limite = ajouterJours(maintenant, -DELAI_REVUE_HEURES / 24);
  const opportunites = await prisma.opportunite.findMany({
    where: { signalements: { some: { traite: false } } },
    include: {
      signalements: { where: { traite: false }, orderBy: { createdAt: "asc" } },
      partenaire: true,
    },
    orderBy: [{ suspendueLe: "asc" }, { updatedAt: "asc" }],
  });
  return opportunites.map((o) => ({
    ...o,
    /** RG-06 : suspendue depuis plus de 48 heures sans revue humaine. */
    revueEnRetard:
      o.statut === "SUSPENDUE" && !o.revueLe && !!o.suspendueLe && o.suspendueLe < limite,
  }));
}

/** Opportunités suspendues sans revue depuis plus de 48 heures (alerte du back-office). */
export async function alertesRevueEnRetard(prisma: ClientBase, maintenant: Date) {
  const limite = ajouterJours(maintenant, -DELAI_REVUE_HEURES / 24);
  return prisma.opportunite.findMany({
    where: { statut: "SUSPENDUE", revueLe: null, suspendueLe: { lt: limite } },
    orderBy: { suspendueLe: "asc" },
  });
}

/**
 * Décision du curateur sur les signalements d'une opportunité.
 * - FRAUDE_CONFIRMEE : l'opportunité reste (ou passe) SUSPENDUE.
 * - REJETE : le signalement est écarté ; si l'opportunité était suspendue, elle redevient VERIFIEE.
 */
export async function traiterSignalements(
  ctx: Contexte,
  entree: { opportuniteId: string; decision: "FRAUDE_CONFIRMEE" | "REJETE"; adminId: string },
) {
  const maintenant = ctx.horloge.maintenant();
  return ctx.prisma.$transaction(async (tx) => {
    await tx.signalement.updateMany({
      where: { opportuniteId: entree.opportuniteId, traite: false },
      data: {
        traite: true,
        decision: entree.decision,
        traiteLe: maintenant,
        traiteParId: entree.adminId,
      },
    });
    if (entree.decision === "FRAUDE_CONFIRMEE") {
      return tx.opportunite.update({
        where: { id: entree.opportuniteId },
        data: { statut: "SUSPENDUE", revueLe: maintenant, suspendueLe: maintenant },
      });
    }
    const opportunite = await tx.opportunite.findUniqueOrThrow({
      where: { id: entree.opportuniteId },
    });
    return tx.opportunite.update({
      where: { id: entree.opportuniteId },
      data: {
        revueLe: maintenant,
        nbSignalements: 0,
        ...(opportunite.statut === "SUSPENDUE" && opportunite.verifieLe
          ? { statut: "VERIFIEE" as const, suspendueLe: null }
          : {}),
      },
    });
  });
}

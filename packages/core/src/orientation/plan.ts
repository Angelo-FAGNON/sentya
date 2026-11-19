// EF-07 : plan d'action en 3 étapes, construit à partir des modèles d'étapes de la base
// et des opportunités vérifiées. Aucune donnée pratique n'est générée par l'IA.
import type { EtapeStatut, Voie } from "@sentya/db";
import type { ClientBase, Contexte } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { formaterDate } from "../dates";
import { ajouterJours, JOUR_MS } from "../horloge";
import { fr, STATUT_ETAPE_LIBELLE } from "../messages/fr";
import { STATUT_OPPORTUNITE_VISIBLE, STATUTS_REFERENTIEL_ELIGIBLES } from "../regles/eligibilite";
import { calculerRappels } from "../regles/rappels";
import { formaterCout, mentionSource } from "../regles/sources";

export const ETAPES_MAX = 3;
/**
 * L'opportunité vérifiée éventuelle est rattachée à l'étape 2 (l'action concrète).
 * Elle n'est jamais recopiée dans le texte de l'étape.
 */
export const ORDRE_ETAPE_OPPORTUNITE = 2;

export class PlanIndisponibleError extends Error {
  constructor() {
    super("Aucun modele d'etapes pour cette piste.");
    this.name = "PlanIndisponibleError";
  }
}

/** Opportunités proposables : VERIFIEE, même pays, même métier, non expirées (EF-09). */
export async function opportunitesVisibles(
  prisma: ClientBase,
  filtre: { pays: "BJ" | "TG"; metierId: string; maintenant: Date },
) {
  return prisma.opportunite.findMany({
    where: {
      statut: STATUT_OPPORTUNITE_VISIBLE,
      pays: filtre.pays,
      metierId: filtre.metierId,
      verifieLe: { not: null },
      OR: [{ dateLimite: null }, { dateLimite: { gt: filtre.maintenant } }],
    },
    orderBy: [{ verifieLe: "desc" }, { id: "asc" }],
    take: 3,
  });
}

/**
 * Crée le plan de la piste choisie. Dans une seule transaction : l'ancien plan actif est
 * désactivé (ses rappels non envoyés sont supprimés), la piste est marquée choisie,
 * le plan, ses 3 étapes et ses 3 rappels sont créés.
 */
export async function creerPlan(ctx: Contexte, entree: { userId: string; pisteId: string }) {
  const maintenant = ctx.horloge.maintenant();
  const piste = await ctx.prisma.piste.findFirst({
    where: { id: entree.pisteId, userId: entree.userId },
    include: { metier: true, user: { select: { userHash: true, createdAt: true } } },
  });
  if (!piste) throw new Error("Piste introuvable pour ce jeune.");

  const chercherModeles = (voie: Voie) =>
    ctx.prisma.modeleEtape.findMany({
      where: { metierId: piste.metierId, voie, statut: { in: STATUTS_REFERENTIEL_ELIGIBLES } },
      include: { programme: true, formation: true },
      orderBy: { ordre: "asc" },
      take: ETAPES_MAX,
    });
  const modeles = await chercherModeles(piste.voie);
  if (modeles.length === 0) throw new PlanIndisponibleError();

  const [opportunite] = await opportunitesVisibles(ctx.prisma, {
    pays: piste.metier.pays,
    metierId: piste.metierId,
    maintenant,
  });

  const etapes = modeles.map((modele, index) => {
    const ordre = index + 1;
    const lignes = [modele.details];
    let source = {
      sourceUrl: modele.sourceUrl,
      verifieLe: modele.verifieLe,
      statut: modele.statut,
    };
    if (modele.programme && STATUTS_REFERENTIEL_ELIGIBLES.includes(modele.programme.statut)) {
      const p = modele.programme;
      lignes.push(`${p.nom} : ${p.conditions}`, `Contact : ${p.contact}`);
      source = { sourceUrl: p.sourceUrl, verifieLe: p.verifieLe, statut: p.statut };
    } else if (
      modele.formation &&
      STATUTS_REFERENTIEL_ELIGIBLES.includes(modele.formation.statut)
    ) {
      const f = modele.formation;
      lignes.push(
        `${f.intitule} (${f.organisme})`,
        fr.ficheDuree(f.dureeIndicative),
        fr.ficheCout(formaterCout(f.coutIndicatifFcfa)),
      );
      source = { sourceUrl: f.sourceUrl, verifieLe: f.verifieLe, statut: f.statut };
    }
    let opportuniteId: string | null = null;
    if (
      opportunite &&
      opportunite.verifieLe &&
      ordre === Math.min(ORDRE_ETAPE_OPPORTUNITE, modeles.length)
    ) {
      // Seule la référence est gardée : l'offre est affichée au moment de la lecture du plan,
      // et uniquement si elle est encore VERIFIEE (une offre suspendue disparaît partout).
      opportuniteId = opportunite.id;
    }
    return {
      ordre,
      titre: modele.titre,
      details: lignes.join("\n"),
      echeance: ajouterJours(maintenant, modele.delaiJours),
      modeleEtapeId: modele.id,
      programmeId: modele.programmeId,
      formationId: modele.formationId,
      opportuniteId,
      sourceUrl: source.sourceUrl,
      verifieLe: source.statut === "VERIFIEE" ? source.verifieLe : null,
    };
  });

  const plan = await ctx.prisma.$transaction(async (tx) => {
    const anciens = await tx.plan.findMany({
      where: { userId: entree.userId, actif: true },
      select: { id: true },
    });
    if (anciens.length > 0) {
      const ids = anciens.map((p) => p.id);
      await tx.plan.updateMany({ where: { id: { in: ids } }, data: { actif: false } });
      await tx.rappel.deleteMany({ where: { planId: { in: ids }, envoyeLe: null } });
    }
    // Un plan existe déjà pour cette piste (double clic) : on le réactive simplement.
    const existant = await tx.plan.findUnique({ where: { pisteId: piste.id } });
    if (existant) {
      await tx.plan.update({ where: { id: existant.id }, data: { actif: true } });
      return tx.plan.findUniqueOrThrow({
        where: { id: existant.id },
        include: { etapes: { orderBy: { ordre: "asc" } }, rappels: true },
      });
    }

    await tx.piste.update({ where: { id: piste.id }, data: { choisie: true } });
    const cree = await tx.plan.create({
      data: {
        userId: entree.userId,
        pisteId: piste.id,
        createdAt: maintenant,
        etapes: { create: etapes },
        rappels: { create: calculerRappels(maintenant) },
      },
      include: { etapes: { orderBy: { ordre: "asc" } }, rappels: true },
    });
    await enregistrerEvenement(tx, {
      type: EVENEMENTS.PLAN_CREE,
      userHash: piste.user.userHash,
      payload: {
        planRef: cree.id,
        nbEtapes: cree.etapes.length,
        voie: piste.voie,
        aExplorer: piste.aExplorer,
        dureeDepuisProfilMs: maintenant.getTime() - piste.user.createdAt.getTime(),
      },
      date: maintenant,
    });
    return cree;
  });

  return plan;
}

/** Plan actif du jeune, avec la piste et le métier. */
export async function planActif(prisma: ClientBase, userId: string) {
  return prisma.plan.findFirst({
    where: { userId, actif: true },
    include: {
      etapes: { orderBy: { ordre: "asc" } },
      piste: { include: { metier: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

type PlanComplet = NonNullable<Awaited<ReturnType<typeof planActif>>>;

/** Messages du plan : introduction, une étape par message, conclusion avec une action. */
export function formaterPlan(plan: Pick<PlanComplet, "etapes">): string[] {
  const messages: string[] = [fr.introPlan];
  for (const etape of plan.etapes) {
    messages.push(
      fr.etape({
        ordre: etape.ordre,
        titre: etape.titre,
        details:
          etape.statut === "A_FAIRE"
            ? etape.details
            : `${etape.details}\nStatut : ${STATUT_ETAPE_LIBELLE[etape.statut]}.`,
        echeance: formaterDate(etape.echeance),
        source: mentionSource({
          sourceUrl: etape.sourceUrl,
          verifieLe: etape.verifieLe,
          statut: etape.verifieLe ? "VERIFIEE" : "A_VERIFIER",
        }),
      }),
    );
  }
  const premiere = plan.etapes.find((e) => e.statut === "A_FAIRE") ?? plan.etapes[0];
  if (premiere) messages.push(fr.conclusionPlan(premiere.titre));
  return messages;
}

/**
 * Met à jour le statut d'une étape. Pour BLOQUE et ABANDONNE, une raison est obligatoire.
 * La raison est enregistrée telle quelle : l'appelant la filtre d'abord (RG-08).
 */
export async function changerStatutEtape(
  ctx: Contexte,
  entree: { userId: string; etapeId: string; statut: EtapeStatut; raison?: string },
) {
  if ((entree.statut === "BLOQUE" || entree.statut === "ABANDONNE") && !entree.raison?.trim()) {
    throw new Error("Une raison est obligatoire pour ce statut.");
  }
  const maintenant = ctx.horloge.maintenant();
  const etape = await ctx.prisma.planEtape.findFirst({
    where: { id: entree.etapeId, plan: { userId: entree.userId } },
    include: { plan: { include: { user: { select: { userHash: true } } } } },
  });
  if (!etape) throw new Error("Etape introuvable pour ce jeune.");

  const misAJour = await ctx.prisma.planEtape.update({
    where: { id: etape.id },
    data: {
      statut: entree.statut,
      raison:
        entree.statut === "BLOQUE" || entree.statut === "ABANDONNE" ? entree.raison?.trim() : null,
      statutMajLe: maintenant,
    },
  });
  await enregistrerEvenement(ctx.prisma, {
    type: EVENEMENTS.ETAPE_STATUT,
    userHash: etape.plan.user.userHash,
    payload: {
      planRef: etape.planId,
      ordre: etape.ordre,
      statut: entree.statut,
      joursDepuisPlan: Math.floor(
        (maintenant.getTime() - etape.plan.createdAt.getTime()) / JOUR_MS,
      ),
    },
    date: maintenant,
  });
  return misAJour;
}

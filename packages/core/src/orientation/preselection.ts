// EF-05 étape 1 : présélection en code, sans IA, d'au plus 15 métiers candidats,
// filtrés par pays et classés selon le recouvrement des compétences et l'objectif.
import type { Objectif, Pays, Voie } from "@sentya/db";
import type { ClientBase } from "../contexte";
import { STATUTS_REFERENTIEL_ELIGIBLES } from "../regles/eligibilite";
import { ORDRE_VOIES, voiePreferee } from "./profil";

export const CANDIDATS_MAX = 15;
const BONUS_OBJECTIF = 15;
const POINTS_PAR_COMPETENCE = 10;

export interface MetierSource {
  id: string;
  libelle: string;
  description: string;
  sourceUrl: string;
  verifieLe: Date | null;
  statut: "BROUILLON" | "VERIFIEE" | "A_VERIFIER" | "SUSPENDUE";
  competences: { competenceId: string; poids: number }[];
  voiesDisponibles: Voie[];
  /** Titre de la première étape par voie, pour le texte du repli. */
  premieresEtapes: Partial<Record<Voie, string>>;
}

export interface Candidat {
  metier: MetierSource;
  score: number;
  competencesCommunes: string[];
  voieSuggeree: Voie;
}

/** Charge les métiers éligibles du pays, avec les voies qui ont des modèles d'étapes. */
export async function chargerMetiersEligibles(
  prisma: ClientBase,
  pays: Pays,
): Promise<MetierSource[]> {
  const metiers = await prisma.metier.findMany({
    where: { pays, statut: { in: STATUTS_REFERENTIEL_ELIGIBLES } },
    include: {
      competences: { select: { competenceId: true, poids: true } },
      modeles: {
        where: { statut: { in: STATUTS_REFERENTIEL_ELIGIBLES } },
        select: { voie: true, ordre: true, titre: true },
        orderBy: { ordre: "asc" },
      },
    },
    orderBy: { id: "asc" },
  });

  return metiers.map((m) => {
    const premieresEtapes: Partial<Record<Voie, string>> = {};
    for (const modele of m.modeles) {
      if (!premieresEtapes[modele.voie]) premieresEtapes[modele.voie] = modele.titre;
    }
    return {
      id: m.id,
      libelle: m.libelle,
      description: m.description,
      sourceUrl: m.sourceUrl,
      verifieLe: m.verifieLe,
      statut: m.statut,
      competences: m.competences,
      voiesDisponibles: ORDRE_VOIES.filter((v) => m.modeles.some((e) => e.voie === v)),
      premieresEtapes,
    };
  });
}

/** Voie proposée par défaut : celle de l'objectif si elle existe, sinon la première disponible. */
export function choisirVoie(voiesDisponibles: Voie[], objectif: Objectif | null): Voie {
  const preferee = voiePreferee(objectif);
  if (preferee && voiesDisponibles.includes(preferee)) return preferee;
  const premiere = voiesDisponibles[0];
  if (!premiere) throw new Error("Aucune voie disponible pour ce metier.");
  return premiere;
}

/**
 * Classe les métiers. Fonction pure et déterministe : mêmes entrées, même sortie.
 * Elle ne reçoit ni prénom ni genre, seulement les compétences et l'objectif.
 */
export function preselectionner(
  metiers: MetierSource[],
  competencesJeune: string[],
  objectif: Objectif | null,
  max = CANDIDATS_MAX,
): Candidat[] {
  const possedees = new Set(competencesJeune);
  const preferee = voiePreferee(objectif);

  const candidats = metiers
    .filter((m) => m.voiesDisponibles.length > 0)
    .map((metier) => {
      const poidsTotal = metier.competences.reduce((s, c) => s + c.poids, 0);
      const communes = metier.competences.filter((c) => possedees.has(c.competenceId));
      const poidsCommun = communes.reduce((s, c) => s + c.poids, 0);
      const couverture = poidsTotal > 0 ? poidsCommun / poidsTotal : 0;
      const bonus = preferee && metier.voiesDisponibles.includes(preferee) ? BONUS_OBJECTIF : 0;
      const score =
        communes.length > 0
          ? Math.round(couverture * 100) + communes.length * POINTS_PAR_COMPETENCE + bonus
          : bonus;
      return {
        metier,
        score,
        competencesCommunes: communes.map((c) => c.competenceId).sort(),
        voieSuggeree: choisirVoie(metier.voiesDisponibles, objectif),
      };
    })
    .sort(
      (a, b) =>
        Number(b.competencesCommunes.length > 0) - Number(a.competencesCommunes.length > 0) ||
        b.score - a.score ||
        a.metier.id.localeCompare(b.metier.id),
    );

  // On garde les métiers avec au moins une compétence commune ; s'il y en a moins de 3,
  // on complète avec les suivants pour toujours pouvoir proposer 3 pistes.
  const avecRecouvrement = candidats.filter((c) => c.competencesCommunes.length > 0);
  const retenus =
    avecRecouvrement.length >= 3
      ? avecRecouvrement
      : candidats.slice(0, Math.max(3, avecRecouvrement.length));
  return retenus.slice(0, max);
}

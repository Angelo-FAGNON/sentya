// EF-02 : questions du bilan (une par message) et enregistrement des réponses.
// Chaque réponse est filtrée des données sensibles AVANT d'être écrite (RG-08).
import type { SourceType } from "@sentya/db";
import type { Bouton } from "../canal/canal";
import type { Contexte } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { filtrerDonneesSensibles } from "../confidentialite/donnees-sensibles";
import { fr } from "../messages/fr";
import { normaliserNiveauEtudes, normaliserObjectif } from "./profil";

export type CleQuestion = "activites" | "duree" | "aime" | "ville" | "etudes" | "objectif";

export interface QuestionBilan {
  cle: CleQuestion;
  texte: string;
  boutons: Bouton[];
  /** Nombre minimal de caractères pour une réponse libre. */
  longueurMin: number;
}

export const ACTIONS_BILAN = {
  pasDeDiplome: "etudes:aucun",
  objectifEmploi: "objectif:EMPLOI",
  objectifFormation: "objectif:FORMATION",
  objectifActivite: "objectif:PROPRE_ACTIVITE",
} as const;

/** Les 6 questions, dans l'ordre. */
export const QUESTIONS_BILAN: QuestionBilan[] = [
  { cle: "activites", texte: fr.questions.activites, boutons: [], longueurMin: 8 },
  { cle: "duree", texte: fr.questions.duree, boutons: [], longueurMin: 2 },
  { cle: "aime", texte: fr.questions.aime, boutons: [], longueurMin: 3 },
  { cle: "ville", texte: fr.questions.ville, boutons: [], longueurMin: 2 },
  {
    cle: "etudes",
    texte: fr.questions.etudes,
    boutons: [{ libelle: fr.boutons.pasDeDiplome, action: ACTIONS_BILAN.pasDeDiplome }],
    longueurMin: 2,
  },
  {
    cle: "objectif",
    texte: fr.questions.objectif,
    boutons: [
      { libelle: fr.boutons.objectifEmploi, action: ACTIONS_BILAN.objectifEmploi },
      { libelle: fr.boutons.objectifFormation, action: ACTIONS_BILAN.objectifFormation },
      { libelle: fr.boutons.objectifActivite, action: ACTIONS_BILAN.objectifActivite },
    ],
    longueurMin: 2,
  },
];

export function questionSuivante(cle: CleQuestion | null): QuestionBilan | null {
  if (cle === null) return QUESTIONS_BILAN[0] ?? null;
  const index = QUESTIONS_BILAN.findIndex((q) => q.cle === cle);
  return QUESTIONS_BILAN[index + 1] ?? null;
}

export function trouverQuestion(cle: string): QuestionBilan | undefined {
  return QUESTIONS_BILAN.find((q) => q.cle === cle);
}

/** Texte enregistré quand le jeune répond avec un bouton. */
export function texteDepuisAction(action: string): string | null {
  switch (action) {
    case ACTIONS_BILAN.pasDeDiplome:
      return fr.boutons.pasDeDiplome;
    case ACTIONS_BILAN.objectifEmploi:
      return fr.boutons.objectifEmploi;
    case ACTIONS_BILAN.objectifFormation:
      return fr.boutons.objectifFormation;
    case ACTIONS_BILAN.objectifActivite:
      return fr.boutons.objectifActivite;
    default:
      return null;
  }
}

export type ResultatReponse =
  | { statut: "ENREGISTREE"; donneesRetirees: boolean }
  | { statut: "VIDE_APRES_FILTRE" }
  | { statut: "TROP_COURTE" };

/** Enregistre une réponse filtrée et met à jour le profil (ville, études, objectif). */
export async function enregistrerReponse(
  ctx: Contexte,
  entree: {
    userId: string;
    userHash: string;
    question: QuestionBilan;
    texte: string;
    sourceType: SourceType;
  },
): Promise<ResultatReponse> {
  const filtre = filtrerDonneesSensibles(entree.texte.slice(0, 2000));
  const maintenant = ctx.horloge.maintenant();
  if (filtre.retire) {
    await enregistrerEvenement(ctx.prisma, {
      type: EVENEMENTS.DONNEES_SENSIBLES_FILTREES,
      userHash: entree.userHash,
      payload: { categories: filtre.categories },
      date: maintenant,
    });
  }
  if (filtre.texte.trim().length === 0) return { statut: "VIDE_APRES_FILTRE" };
  if (filtre.texte.trim().length < entree.question.longueurMin) return { statut: "TROP_COURTE" };

  const texte = filtre.texte.trim();
  await ctx.prisma.$transaction(async (tx) => {
    await tx.bilanReponse.create({
      data: {
        userId: entree.userId,
        question: entree.question.cle,
        texte,
        sourceType: entree.sourceType,
        createdAt: maintenant,
      },
    });
    const majProfil =
      entree.question.cle === "ville"
        ? { ville: texte.slice(0, 60) }
        : entree.question.cle === "etudes"
          ? { niveauEtudes: normaliserNiveauEtudes(texte) }
          : entree.question.cle === "objectif"
            ? { objectif: normaliserObjectif(texte) }
            : {};
    await tx.user.update({
      where: { id: entree.userId },
      data: { ...majProfil, lastActiveAt: maintenant },
    });
  });
  return { statut: "ENREGISTREE", donneesRetirees: filtre.retire };
}

/** Dernière réponse de chaque question, dans l'ordre du bilan. */
export async function reponsesDuBilan(ctx: Contexte, userId: string) {
  const reponses = await ctx.prisma.bilanReponse.findMany({
    where: { userId, sourceType: { not: "CV" } },
    orderBy: { createdAt: "asc" },
  });
  const parQuestion = new Map<string, string>();
  for (const r of reponses) parQuestion.set(r.question, r.texte);
  return QUESTIONS_BILAN.filter((q) => parQuestion.has(q.cle)).map((q) => ({
    question: q.texte,
    texte: parQuestion.get(q.cle) ?? "",
  }));
}

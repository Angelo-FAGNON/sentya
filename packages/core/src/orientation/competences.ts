// EF-03 et EF-04 : extraction des compétences (bilan ou CV), rapprochement avec le
// référentiel, correction par le jeune. L'IA ne peut citer que des identifiants existants.
import type { OrigineCompetence } from "@sentya/db";
import type { ClientBase, Contexte } from "../contexte";
import { pseudonymiser } from "../confidentialite/pseudonymisation";
import { appelerAvecSchema } from "../ia/appel-structure";
import type { PartieMedia } from "../ia/fournisseur";
import { schemaCorrection, schemaExtraction } from "../ia/schemas";
import {
  construireEntreeCorrection,
  PROMPT_CORRECTION,
} from "../prompts/correction-competences.v1";
import {
  construireEntreeExtraction,
  PROMPT_EXTRACTION,
} from "../prompts/extraction-competences.v1";
import { contientTerme, normaliser } from "../texte";

export const COMPETENCES_MAX = 12;
const DELAI_EXTRACTION_MS = 12_000;

export interface CompetenceReferentiel {
  id: string;
  libelle: string;
  synonymes: string[];
}

export interface Activite {
  libelle: string;
  dureeMois: number | null;
}

export interface ResultatExtraction {
  competenceIds: string[];
  activites: Activite[];
  /** "ia" si Gemini a répondu correctement, "repli" sinon. */
  origine: "ia" | "repli";
  idsRejetes: string[];
}

export async function chargerReferentiel(prisma: ClientBase): Promise<CompetenceReferentiel[]> {
  return prisma.competence.findMany({
    select: { id: true, libelle: true, synonymes: true },
    orderBy: { id: "asc" },
  });
}

/** Radical d'un mot : 60 % de sa longueur, au moins 4 lettres (tolère pluriels et conjugaisons). */
const radical = (mot: string) => mot.slice(0, Math.max(4, Math.ceil(mot.length * 0.6)));

/** Mots-outils ignorés dans les synonymes ; les sigles courts ("bts", "cap") restent significatifs. */
const MOTS_OUTILS = new Set(
  "les des une aux pour par sur dans avec mon mes ton tes son ses nous vous ils elles qui que quoi pas plus tres bien fait faire suis est".split(
    " ",
  ),
);

/** Questions dont la réponse ne décrit pas un savoir-faire : exclues du repli par mots-clés. */
export const QUESTIONS_HORS_COMPETENCES = new Set(["ville", "etudes", "objectif"]);

/**
 * Repli sans IA : une compétence est repérée si son libellé ou un synonyme apparaît
 * dans le texte, ou si chaque mot significatif d'un synonyme (3 lettres ou plus) a son
 * radical au début d'un mot du texte ("vendre" reconnaît "je vends").
 */
export function correspondanceDeterministe(
  texte: string,
  referentiel: CompetenceReferentiel[],
): string[] {
  const n = normaliser(texte);
  const motsTexte = n.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const trouvees: string[] = [];
  for (const competence of referentiel) {
    const expressions = [competence.libelle, ...competence.synonymes];
    const trouve = expressions.some((expression) => {
      if (contientTerme(n, expression)) return true;
      const motsUtiles = normaliser(expression)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((m) => m.length >= 3 && !MOTS_OUTILS.has(m));
      return (
        motsUtiles.length > 0 &&
        motsUtiles.every((m) => motsTexte.some((t) => t.startsWith(radical(m))))
      );
    });
    if (trouve) trouvees.push(competence.id);
  }
  return trouvees.slice(0, COMPETENCES_MAX);
}

/** Garde uniquement les identifiants du référentiel, sans doublon. */
export function filtrerIdentifiants(
  ids: string[],
  referentiel: CompetenceReferentiel[],
): { valides: string[]; rejetes: string[] } {
  const connus = new Set(referentiel.map((c) => c.id));
  const valides: string[] = [];
  const rejetes: string[] = [];
  for (const id of ids) {
    if (!connus.has(id)) rejetes.push(id);
    else if (!valides.includes(id)) valides.push(id);
  }
  return { valides: valides.slice(0, COMPETENCES_MAX), rejetes };
}

export interface EntreeExtractionBilan {
  /** "cle" identifie la question (ex. "activites") pour le repli par mots-clés. */
  reponses: { question: string; texte: string; cle?: string }[];
  /** Noms à retirer avant l'envoi à l'IA (prénom, nom Telegram). */
  nomsConnus?: (string | null | undefined)[];
  /** CV en PDF ou en image (EF-04). */
  cv?: PartieMedia;
  /** Dernier essai après une indisponibilité : repli sans IA. */
  repliSiIndisponible?: boolean;
}

/** Extrait les compétences d'un bilan (ou d'un CV) et les relie au référentiel. */
export async function extraireCompetences(
  ctx: Contexte,
  entree: EntreeExtractionBilan,
): Promise<ResultatExtraction> {
  const referentiel = await chargerReferentiel(ctx.prisma);
  const reponses = entree.reponses.map((r) => ({
    question: r.question,
    texte: pseudonymiser(r.texte, { nomsConnus: entree.nomsConnus }),
  }));

  const resultat = await appelerAvecSchema(
    ctx.ia,
    {
      version: PROMPT_EXTRACTION.version,
      systeme: entree.cv ? PROMPT_EXTRACTION.systemeCv : PROMPT_EXTRACTION.systeme,
      texte: construireEntreeExtraction({ reponses, referentiel }),
      media: entree.cv,
      schema: schemaExtraction,
      delaiMs: DELAI_EXTRACTION_MS,
      repliSiIndisponible: entree.repliSiIndisponible,
    },
    ctx.journal,
  );

  // Le repli ne lit que les réponses qui décrivent des savoir-faire.
  const texteComplet = entree.reponses
    .filter((r) => !r.cle || !QUESTIONS_HORS_COMPETENCES.has(r.cle))
    .map((r) => pseudonymiser(r.texte, { nomsConnus: entree.nomsConnus }))
    .join(". ");
  if (!resultat.ok) {
    return {
      competenceIds: entree.cv ? [] : correspondanceDeterministe(texteComplet, referentiel),
      activites: [],
      origine: "repli",
      idsRejetes: [],
    };
  }

  const { valides, rejetes } = filtrerIdentifiants(
    resultat.donnees.competences.map((c) => c.id),
    referentiel,
  );
  if (rejetes.length > 0) {
    ctx.journal.warn({ idsRejetes: rejetes }, "competences hors referentiel rejetees");
  }
  // Si l'IA ne trouve rien de valide, le repli peut encore repérer des mots clés.
  const competenceIds =
    valides.length > 0 || entree.cv
      ? valides
      : correspondanceDeterministe(texteComplet, referentiel);

  return {
    competenceIds,
    activites: resultat.donnees.activites,
    origine: "ia",
    idsRejetes: rejetes,
  };
}

const MOTS_RETRAIT =
  /\b(retire|retirer|enleve|enlever|supprime|supprimer|efface|pas|plus|faux|fausse|non)\b/;

/** Correction par le jeune : ajouter ou retirer des compétences (texte ou vocal transcrit). */
export async function interpreterCorrection(
  ctx: Contexte,
  entree: {
    demande: string;
    actuelles: string[];
    nomsConnus?: (string | null | undefined)[];
    repliSiIndisponible?: boolean;
  },
): Promise<{ ajouter: string[]; retirer: string[] }> {
  const referentiel = await chargerReferentiel(ctx.prisma);
  const parId = new Map(referentiel.map((c) => [c.id, c]));
  const demande = pseudonymiser(entree.demande, { nomsConnus: entree.nomsConnus });

  const resultat = await appelerAvecSchema(
    ctx.ia,
    {
      version: PROMPT_CORRECTION.version,
      systeme: PROMPT_CORRECTION.systeme,
      texte: construireEntreeCorrection({
        demande,
        actuelles: entree.actuelles
          .map((id) => parId.get(id))
          .filter((c): c is CompetenceReferentiel => !!c)
          .map((c) => ({ id: c.id, libelle: c.libelle })),
        referentiel,
      }),
      schema: schemaCorrection,
      delaiMs: DELAI_EXTRACTION_MS,
      repliSiIndisponible: entree.repliSiIndisponible,
    },
    ctx.journal,
  );

  if (resultat.ok) {
    return {
      ajouter: filtrerIdentifiants(resultat.donnees.ajouter, referentiel).valides,
      retirer: resultat.donnees.retirer.filter((id) => entree.actuelles.includes(id)),
    };
  }

  // Repli : une phrase de retrait retire les compétences citées, sinon elles sont ajoutées.
  const citees = correspondanceDeterministe(demande, referentiel);
  if (MOTS_RETRAIT.test(normaliser(demande))) {
    return { ajouter: [], retirer: citees.filter((id) => entree.actuelles.includes(id)) };
  }
  return { ajouter: citees, retirer: [] };
}

/** Applique une correction à une liste d'identifiants. */
export function appliquerCorrection(
  actuelles: string[],
  correction: { ajouter: string[]; retirer: string[] },
): string[] {
  const resultat = actuelles.filter((id) => !correction.retirer.includes(id));
  for (const id of correction.ajouter) {
    if (!resultat.includes(id)) resultat.push(id);
  }
  return resultat.slice(0, COMPETENCES_MAX);
}

/** Fusionne deux listes (bilan et CV), sans doublon, dans la limite autorisée. */
export function fusionnerCompetences(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].slice(0, COMPETENCES_MAX);
}

/** Remplace les compétences du jeune par la liste donnée. */
export async function enregistrerCompetences(
  prisma: ClientBase,
  userId: string,
  competences: { id: string; origine: OrigineCompetence }[],
  validee: boolean,
): Promise<void> {
  await prisma.userCompetence.deleteMany({ where: { userId } });
  if (competences.length === 0) return;
  await prisma.userCompetence.createMany({
    data: competences.map((c) => ({ userId, competenceId: c.id, origine: c.origine, validee })),
    skipDuplicates: true,
  });
}

/** Libellés des compétences, dans l'ordre des identifiants donnés. */
export async function libellesCompetences(prisma: ClientBase, ids: string[]): Promise<string[]> {
  const lignes = await prisma.competence.findMany({ where: { id: { in: ids } } });
  const parId = new Map(lignes.map((c) => [c.id, c.libelle]));
  return ids.map((id) => parId.get(id)).filter((l): l is string => !!l);
}

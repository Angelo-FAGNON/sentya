// EF-05 étapes 2 et 3 : choix des pistes par l'IA parmi les candidats, puis validation
// serveur (RG-03). Toute piste est liée à un métier du référentiel ; les compléments
// issus du repli sont marqués "à explorer". Chaque recommandation est journalisée.
import { randomUUID } from "node:crypto";
import type { NiveauEtudes, Objectif, Pays, Voie } from "@sentya/db";
import type { ClientBase, Contexte } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { appelerAvecSchema } from "../ia/appel-structure";
import { IAIndisponibleError } from "../ia/fournisseur";
import { schemaChoixPistes, type SortieChoixPistes } from "../ia/schemas";
import { fr } from "../messages/fr";
import {
  construireEntreeChoixPistes,
  PROMPT_CHOIX_PISTES,
  type EntreeChoixPistes,
} from "../prompts/choix-pistes.v1";
import { normaliser } from "../texte";
import type { Activite } from "./competences";
import { libellesCompetences } from "./competences";
import { chargerMetiersEligibles, preselectionner, type Candidat } from "./preselection";

export const PISTES_MAX = 3;
/** Délai par tentative : 2 tentatives tiennent dans l'objectif de 20 secondes. */
const DELAI_CHOIX_MS = 9_000;

export interface PisteValidee {
  metierId: string;
  voie: Voie;
  raison: string;
  conditionPrincipale: string;
  aExplorer: boolean;
}

export interface ResultatValidation {
  pistes: PisteValidee[];
  idsRejetes: string[];
}

/**
 * Garde-fou contre l'invention : refuse un texte de l'IA qui contient un prix, un lien,
 * un contact, un grand nombre ou une promesse de résultat (RG-09).
 */
export function texteIASur(texte: string): boolean {
  const n = normaliser(texte);
  const interdits = [
    /fcfa|f cfa|francs?|euros?|\$|salaire de/,
    /https?:|www\.|\.com|\.bj|\.tg|@/,
    /(\d[\s.-]?){6,}/,
    /\b(garanti\w*|assure\w*|promis|promets|certain\w*|sans aucun doute|a coup sur)\b/,
    /\[(nom|telephone|email|adresse|lien|numero)\]/,
  ];
  if (interdits.some((m) => m.test(n))) return false;
  // Les petits nombres ne sont acceptés que pour une durée d'expérience ("3 ans", "6 mois").
  const nombres = [...n.matchAll(/\b(\d+)\s*([a-z]*)/g)];
  return nombres.every(
    ([, valeur, unite]) => Number(valeur) <= 60 && /^(ans?|annees?|mois)$/.test(unite ?? ""),
  );
}

/** Construit une piste "à explorer" à partir d'un candidat, sans IA. */
function pisteDeRepli(candidat: Candidat, libellesParId: Map<string, string>): PisteValidee {
  const libelles = candidat.competencesCommunes
    .map((id) => libellesParId.get(id))
    .filter((l): l is string => !!l)
    .map((l) => l.toLowerCase());
  return {
    metierId: candidat.metier.id,
    voie: candidat.voieSuggeree,
    raison: fr.raisonRepli(libelles),
    conditionPrincipale: fr.conditionRepli(candidat.metier.premieresEtapes[candidat.voieSuggeree]),
    aExplorer: true,
  };
}

/**
 * RG-03 : ne garde que les pistes dont le métier est parmi les candidats (donc dans la base),
 * corrige une voie indisponible, remplace un texte douteux, puis complète jusqu'à 3 pistes
 * avec les meilleurs candidats marqués "à explorer". Fonction pure.
 */
export function validerEtCompleterPistes(
  sortie: SortieChoixPistes | null,
  candidats: Candidat[],
  libellesParId: Map<string, string>,
): ResultatValidation {
  const parId = new Map(candidats.map((c) => [c.metier.id, c]));
  const pistes: PisteValidee[] = [];
  const idsRejetes: string[] = [];

  for (const proposee of sortie?.pistes ?? []) {
    const candidat = parId.get(proposee.metierId);
    if (!candidat) {
      idsRejetes.push(proposee.metierId);
      continue;
    }
    if (pistes.some((p) => p.metierId === proposee.metierId)) continue;
    if (pistes.length >= PISTES_MAX) break;

    const repli = pisteDeRepli(candidat, libellesParId);
    const voie = candidat.metier.voiesDisponibles.includes(proposee.voie)
      ? proposee.voie
      : candidat.voieSuggeree;
    pistes.push({
      metierId: proposee.metierId,
      voie,
      raison: texteIASur(proposee.raison) ? proposee.raison.trim() : repli.raison,
      conditionPrincipale: texteIASur(proposee.conditionPrincipale)
        ? proposee.conditionPrincipale.trim()
        : fr.conditionRepli(candidat.metier.premieresEtapes[voie]),
      aExplorer: false,
    });
  }

  for (const candidat of candidats) {
    if (pistes.length >= PISTES_MAX) break;
    if (pistes.some((p) => p.metierId === candidat.metier.id)) continue;
    pistes.push(pisteDeRepli(candidat, libellesParId));
  }

  return { pistes, idsRejetes };
}

export interface ProfilPourPistes {
  userId: string;
  userHash: string;
  pays: Pays;
  objectif: Objectif | null;
  niveauEtudes: NiveauEtudes | null;
  competenceIds: string[];
  activites: Activite[];
}

export interface PisteAffichable extends PisteValidee {
  id: string;
  rang: number;
  libelle: string;
  description: string;
  sourceUrl: string;
  verifieLe: Date | null;
  statut: "BROUILLON" | "VERIFIEE" | "A_VERIFIER" | "SUSPENDUE";
}

export class AucunMetierError extends Error {
  constructor() {
    super("Aucun metier eligible pour ce pays.");
    this.name = "AucunMetierError";
  }
}

/** Entrée de l'IA, construite uniquement à partir de données neutres (égalité de traitement). */
export async function construireEntreePourIA(
  prisma: ClientBase,
  profil: Pick<
    ProfilPourPistes,
    "pays" | "objectif" | "niveauEtudes" | "competenceIds" | "activites"
  >,
  candidats: Candidat[],
): Promise<{ entree: EntreeChoixPistes; libellesParId: Map<string, string> }> {
  const tousIds = [
    ...new Set([...profil.competenceIds, ...candidats.flatMap((c) => c.competencesCommunes)]),
  ];
  const libelles = await prisma.competence.findMany({ where: { id: { in: tousIds } } });
  const libellesParId = new Map(libelles.map((c) => [c.id, c.libelle]));
  const libelle = (id: string) => libellesParId.get(id) ?? id;

  return {
    libellesParId,
    entree: {
      pays: profil.pays,
      objectif: profil.objectif,
      niveauEtudes: profil.niveauEtudes,
      competences: profil.competenceIds.map(libelle),
      activites: profil.activites,
      candidats: candidats.map((c) => ({
        metierId: c.metier.id,
        libelle: c.metier.libelle,
        description: c.metier.description,
        competencesCommunes: c.competencesCommunes.map(libelle),
        voiesDisponibles: c.metier.voiesDisponibles,
      })),
    },
  };
}

/**
 * Génère et enregistre 3 pistes. Lève IAIndisponibleError si l'IA ne répond pas,
 * sauf si repliSiIndisponible est vrai (dernier essai d'une tâche de reprise).
 */
export async function genererPistes(
  ctx: Contexte,
  profil: ProfilPourPistes,
  options: { repliSiIndisponible?: boolean } = {},
): Promise<PisteAffichable[]> {
  const debut = ctx.horloge.maintenant().getTime();
  const metiers = await chargerMetiersEligibles(ctx.prisma, profil.pays);
  const candidats = preselectionner(metiers, profil.competenceIds, profil.objectif);
  if (candidats.length === 0) throw new AucunMetierError();

  const { entree, libellesParId } = await construireEntreePourIA(ctx.prisma, profil, candidats);

  let sortie: SortieChoixPistes | null = null;
  try {
    const resultat = await appelerAvecSchema(
      ctx.ia,
      {
        version: PROMPT_CHOIX_PISTES.version,
        systeme: PROMPT_CHOIX_PISTES.systeme,
        texte: construireEntreeChoixPistes(entree),
        schema: schemaChoixPistes,
        delaiMs: DELAI_CHOIX_MS,
      },
      ctx.journal,
    );
    sortie = resultat.ok ? resultat.donnees : null;
  } catch (erreur) {
    if (!(erreur instanceof IAIndisponibleError) || !options.repliSiIndisponible) throw erreur;
    ctx.journal.warn("IA indisponible au dernier essai : repli deterministe");
  }

  const { pistes, idsRejetes } = validerEtCompleterPistes(sortie, candidats, libellesParId);
  const metiersParId = new Map(metiers.map((m) => [m.id, m]));
  const lotId = randomUUID();
  const maintenant = ctx.horloge.maintenant();

  const crees = await ctx.prisma.$transaction(async (tx) => {
    const lignes = [];
    for (const [index, piste] of pistes.entries()) {
      lignes.push(
        await tx.piste.create({
          data: {
            userId: profil.userId,
            lotId,
            rang: index + 1,
            metierId: piste.metierId,
            voie: piste.voie,
            raison: piste.raison,
            conditionPrincipale: piste.conditionPrincipale,
            aExplorer: piste.aExplorer,
            createdAt: maintenant,
          },
        }),
      );
    }
    await tx.recommandationLog.create({
      data: {
        userHash: profil.userHash,
        lotId,
        pays: profil.pays,
        promptVersion: PROMPT_CHOIX_PISTES.version,
        modele: ctx.ia.modele,
        metierIdsCandidats: candidats.map((c) => c.metier.id),
        metierIdsProposes: pistes.map((p) => p.metierId),
        metierIdsAExplorer: pistes.filter((p) => p.aExplorer).map((p) => p.metierId),
        idsRejetes,
        sources: pistes.map((p) => {
          const metier = metiersParId.get(p.metierId);
          return {
            metierId: p.metierId,
            sourceUrl: metier?.sourceUrl ?? null,
            verifieLe: metier?.verifieLe?.toISOString() ?? null,
          };
        }),
        repliTotal: sortie === null,
        dureeMs: ctx.horloge.maintenant().getTime() - debut,
        createdAt: maintenant,
      },
    });
    await enregistrerEvenement(tx, {
      type: EVENEMENTS.PISTES_GENEREES,
      userHash: profil.userHash,
      payload: {
        lotId,
        nbAExplorer: pistes.filter((p) => p.aExplorer).length,
        repliTotal: sortie === null,
      },
      date: maintenant,
    });
    return lignes;
  });

  ctx.journal.info(
    { lotId, metiers: pistes.map((p) => p.metierId), idsRejetes, repliTotal: sortie === null },
    "pistes generees",
  );

  return crees.map((ligne) => {
    const metier = metiersParId.get(ligne.metierId);
    if (!metier) throw new Error(`Metier introuvable : ${ligne.metierId}`);
    return {
      id: ligne.id,
      rang: ligne.rang,
      metierId: ligne.metierId,
      voie: ligne.voie,
      raison: ligne.raison,
      conditionPrincipale: ligne.conditionPrincipale,
      aExplorer: ligne.aExplorer,
      libelle: metier.libelle,
      description: metier.description,
      sourceUrl: metier.sourceUrl,
      verifieLe: metier.verifieLe,
      statut: metier.statut,
    };
  });
}

/** Pistes du dernier lot généré pour le jeune (pour /changer et "Retour aux pistes"). */
export async function pistesDuDernierLot(
  prisma: ClientBase,
  userId: string,
): Promise<PisteAffichable[]> {
  const derniere = await prisma.piste.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { lotId: true },
  });
  if (!derniere) return [];
  const pistes = await prisma.piste.findMany({
    where: { lotId: derniere.lotId },
    include: { metier: true },
    orderBy: { rang: "asc" },
  });
  return pistes.map((p) => ({
    id: p.id,
    rang: p.rang,
    metierId: p.metierId,
    voie: p.voie,
    raison: p.raison,
    conditionPrincipale: p.conditionPrincipale,
    aExplorer: p.aExplorer,
    libelle: p.metier.libelle,
    description: p.metier.description,
    sourceUrl: p.metier.sourceUrl,
    verifieLe: p.metier.verifieLe,
    statut: p.metier.statut,
  }));
}

export { libellesCompetences };

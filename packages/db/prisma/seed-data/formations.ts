// Formations génériques et honnêtes, rattachées à un organisme officiel quand il est connu.
// Durée et coût ne sont jamais inventés : "À vérifier par le curateur" et coût null.
import type { Pays } from "../../src/index";
import type { FamilleMetier } from "./metiers";
import { A_VERIFIER, SOURCES } from "./sources";

export interface FormationSeed {
  id: string;
  pays: Pays;
  intitule: string;
  organisme: string;
  sourceUrl: string;
  /** Slugs de métiers (sans préfixe pays) liés à cette formation. */
  metiers: { familles?: FamilleMetier[]; slugs?: string[] };
}

export const DUREE_INDICATIVE = A_VERIFIER;

export const FORMATIONS: FormationSeed[] = [
  {
    id: "bj-apprentissage-cqm",
    pays: "BJ",
    intitule: "Apprentissage chez un maître artisan, avec examen du CQM",
    organisme: "Chambre des Métiers de l'Artisanat du Bénin (examen du CQM)",
    sourceUrl: SOURCES.bjCqmRenove,
    metiers: { familles: ["artisanat"] },
  },
  {
    id: "bj-formation-duale-cqp",
    pays: "BJ",
    intitule: "Formation duale menant au CQP",
    organisme: `Chambre des Métiers de l'Artisanat du Bénin et partenaires publics. ${A_VERIFIER}.`,
    sourceUrl: SOURCES.bjCqp,
    // Métiers cités par la page officielle du premier test d'accès.
    metiers: {
      slugs: [
        "electricite-batiment",
        "maconnerie",
        "plomberie",
        "soudure",
        "patisserie-restauration",
      ],
    },
  },
  {
    id: "bj-immersion-azoli",
    pays: "BJ",
    intitule: "Stage d'immersion en entreprise du programme Azôli",
    organisme: "Agence nationale pour l'emploi (AnpE)",
    sourceUrl: SOURCES.bjAzoli,
    // Filières citées par les pages officielles : électricité, énergies renouvelables, textile.
    metiers: { slugs: ["electricite-batiment", "installation-solaire", "couture"] },
  },
  {
    id: "tg-ateliers-anpe",
    pays: "TG",
    intitule: "Ateliers de l'ANPE : CV, entretien et savoir-être",
    organisme: "Agence nationale pour l'emploi (ANPE Togo)",
    sourceUrl: SOURCES.tgFormations,
    metiers: { familles: ["artisanat", "diplome", "ouvert"] },
  },
  {
    id: "tg-accompagnement-creation",
    pays: "TG",
    intitule: "Accompagnement à la création d'activité",
    organisme: "Agence nationale pour l'emploi (ANPE Togo)",
    sourceUrl: SOURCES.tgEntrepreneuriat,
    metiers: { familles: ["artisanat", "ouvert"] },
  },
];

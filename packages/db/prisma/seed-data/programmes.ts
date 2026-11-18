// Programmes publics réels (Bénin, Togo). Les textes reprennent uniquement ce que les
// pages officielles listées dans sources.ts indiquent. Tout le reste est marqué
// "À vérifier par le curateur" : aucun numéro, adresse, prix ou durée inventé.
import type { Pays, Voie } from "../../src/index";
import { A_VERIFIER, SOURCES } from "./sources";

export interface ProgrammeSeed {
  id: string;
  pays: Pays;
  nom: string;
  description: string;
  publicCible: string;
  conditions: string;
  contact: string;
  voies: Voie[];
  sourceUrl: string;
}

export const PROGRAMMES: ProgrammeSeed[] = [
  {
    id: "bj-azoli",
    pays: "BJ",
    nom: "Azôli",
    description:
      "Programme du Gouvernement béninois mis en œuvre par l'AnpE. Il aide les jeunes à trouver un emploi salarié ou à créer leur activité.",
    publicCible: "Jeunes de 18 à 30 ans, peu ou pas instruits.",
    conditions: `Inscription sur la plateforme de l'AnpE : sica.anpe.bj. Autres conditions : ${A_VERIFIER}.`,
    contact: A_VERIFIER,
    voies: ["EMPLOI", "AUTO_EMPLOI"],
    sourceUrl: SOURCES.bjAzoli,
  },
  {
    id: "bj-cqm",
    pays: "BJ",
    nom: "Certificat de Qualification aux Métiers (CQM)",
    description:
      "Examen qui reconnaît officiellement les compétences des apprentis et des artisans. Il est organisé par la Chambre des Métiers de l'Artisanat du Bénin.",
    publicCible: "Apprentis et artisans.",
    conditions: `Conditions d'inscription : ${A_VERIFIER}.`,
    contact: A_VERIFIER,
    voies: ["FORMATION_CERTIFICATION"],
    sourceUrl: SOURCES.bjCqm,
  },
  {
    id: "bj-cqp",
    pays: "BJ",
    nom: "Certificat de Qualification Professionnelle (CQP)",
    description:
      "Certificat préparé par une formation duale subventionnée. L'accès passe par un test national, avec la Chambre des Métiers de l'Artisanat.",
    publicCible: `Jeunes. Précisions : ${A_VERIFIER}.`,
    conditions: `Réussir le test national d'accès à la formation duale. Autres conditions : ${A_VERIFIER}.`,
    contact: A_VERIFIER,
    voies: ["FORMATION_CERTIFICATION"],
    sourceUrl: SOURCES.bjCqp,
  },
  {
    id: "tg-aide",
    pays: "TG",
    nom: "Programme AIDE (appui à l'insertion et au développement de l'embauche)",
    description:
      "Programme de l'ANPE Togo qui offre un stage pratique de six mois en entreprise. Le stage est renouvelable une fois.",
    publicCible:
      "Jeunes diplômés togolais de 18 à 40 ans, sans emploi, qui cherchent une première expérience.",
    conditions:
      "Être inscrit comme demandeur d'emploi sur le portail de l'ANPE. Choisir le programme AIDE dans son profil. Être disponible immédiatement.",
    contact: A_VERIFIER,
    voies: ["EMPLOI"],
    sourceUrl: SOURCES.tgAide,
  },
  {
    id: "tg-anvt",
    pays: "TG",
    nom: "Agence nationale du volontariat au Togo (ANVT)",
    description:
      "L'ANVT place des volontaires dans des structures d'accueil, avec un contrat écrit. Elle propose le volontariat de compétence et le volontariat d'engagement citoyen.",
    publicCible:
      "Jeunes de 18 à 35 ans. Diplômés sans emploi, ou niveau Terminale au plus pour l'engagement citoyen.",
    conditions:
      "Volontariat de compétence : être diplômé sans emploi et jouir de ses droits civiques. Engagement citoyen : niveau inférieur ou égal à la Terminale, sans activité.",
    contact: A_VERIFIER,
    voies: ["EMPLOI"],
    sourceUrl: SOURCES.tgAnvt,
  },
];

// Catalogue des métiers, défini une fois puis décliné par pays (préfixes "bj-" et "tg-").
// Toutes les fiches sont au statut A_VERIFIER (hypothèse H1) : un curateur doit confirmer
// les lieux et les sources avant de passer une fiche à VERIFIEE.
import type { Pays } from "../../src/index";
import { A_VERIFIER, SOURCES } from "./sources";

/**
 * Famille du métier, utilisée pour choisir les modèles d'étapes et la source :
 * - artisanat : métier appris en atelier, certifiable par le CQM ou le CQP au Bénin ;
 * - diplome : métier qui demande en général un diplôme ou une formation en centre ;
 * - ouvert : métier accessible sans diplôme, souvent en auto-emploi.
 */
export type FamilleMetier = "artisanat" | "diplome" | "ouvert";

/** Zone où le métier se trouve le plus souvent (texte "ouExiste"). */
type Zone = "urbaine" | "rurale";

interface MetierCatalogue {
  slug: string;
  libelle: string;
  /** Complément court pour les titres d'étapes (ex. "en mécanique moto"). */
  fragment: string;
  /** Deux phrases courtes (15 mots au plus chacune). */
  description: string;
  famille: FamilleMetier;
  zone: Zone;
  /** Compétences du référentiel et poids de 1 (utile) à 3 (essentielle). */
  competences: Array<[string, 1 | 2 | 3]>;
}

const CATALOGUE: MetierCatalogue[] = [
  {
    slug: "mecanique-moto",
    libelle: "Mécanicien ou mécanicienne moto",
    fragment: "en mécanique moto",
    description:
      "Tu répares et entretiens les motos et les taxis-motos. Le travail se fait en atelier ou en bord de route.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["mecanique-moto", 3],
      ["outillage-mesure", 2],
      ["resolution-problemes", 2],
      ["relation-client", 1],
      ["conduite-vehicule", 1],
      ["securite-travail", 1],
    ],
  },
  {
    slug: "couture",
    libelle: "Couturier ou couturière",
    fragment: "en couture",
    description:
      "Tu coupes et couds des vêtements sur mesure. Tu fais aussi des retouches pour tes clients.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["couture-retouche", 3],
      ["coupe-patronage", 3],
      ["broderie-tricot", 1],
      ["relation-client", 2],
      ["calcul", 1],
      ["ponctualite-serieux", 1],
    ],
  },
  {
    slug: "coiffure",
    libelle: "Coiffeur ou coiffeuse",
    fragment: "en coiffure",
    description:
      "Tu coiffes, tresses ou coupes les cheveux en salon. Tu conseilles les clients sur leur coiffure.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["coiffure-tresses", 3],
      ["coiffure-homme", 2],
      ["relation-client", 2],
      ["esthetique-soins", 1],
      ["vente-negociation", 1],
    ],
  },
  {
    slug: "electricite-batiment",
    libelle: "Électricien ou électricienne du bâtiment",
    fragment: "en électricité bâtiment",
    description:
      "Tu installes le courant, les prises et l'éclairage dans les maisons. Tu dépannes les installations électriques.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["electricite-batiment", 3],
      ["lecture-plans", 2],
      ["securite-travail", 3],
      ["outillage-mesure", 2],
      ["calcul", 1],
      ["energie-solaire", 1],
    ],
  },
  {
    slug: "soudure",
    libelle: "Soudeur ou soudeuse",
    fragment: "en soudure",
    description:
      "Tu assembles des pièces en métal avec un poste à souder. Tu fabriques portails, grilles et structures.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["soudure-metallique", 3],
      ["securite-travail", 3],
      ["outillage-mesure", 2],
      ["lecture-plans", 1],
      ["travaux-chantier", 1],
    ],
  },
  {
    slug: "groupes-electrogenes",
    libelle: "Technicien ou technicienne en groupes électrogènes",
    fragment: "en groupes électrogènes",
    description:
      "Tu entretiens et répares les groupes électrogènes. Tu interviens chez les particuliers et les entreprises.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["maintenance-groupe-electrogene", 3],
      ["electricite-batiment", 2],
      ["mecanique-auto", 1],
      ["resolution-problemes", 2],
      ["securite-travail", 2],
    ],
  },
  {
    slug: "transformation-agroalimentaire",
    libelle: "Transformateur ou transformatrice de produits agricoles",
    fragment: "en transformation agroalimentaire",
    description:
      "Tu transformes manioc, fruits, karité ou palme en produits à vendre. L'hygiène et l'emballage comptent beaucoup.",
    famille: "artisanat",
    zone: "rurale",
    competences: [
      ["transformation-agroalimentaire", 3],
      ["hygiene-alimentaire", 3],
      ["conditionnement-emballage", 2],
      ["vente-negociation", 1],
      ["gestion-petite-activite", 1],
    ],
  },
  {
    slug: "comptabilite",
    libelle: "Aide-comptable",
    fragment: "en comptabilité",
    description:
      "Tu enregistres les dépenses et les recettes d'une entreprise. Tu prépares les documents pour le comptable.",
    famille: "diplome",
    zone: "urbaine",
    competences: [
      ["comptabilite", 3],
      ["calcul", 3],
      ["bureautique", 2],
      ["organisation-travail", 2],
      ["ponctualite-serieux", 1],
    ],
  },
  {
    slug: "vente",
    libelle: "Vendeur ou vendeuse",
    fragment: "en vente",
    description:
      "Tu accueilles les clients et vends des produits en boutique ou au marché. Tu tiens la caisse et le stock.",
    famille: "ouvert",
    zone: "urbaine",
    competences: [
      ["vente-negociation", 3],
      ["relation-client", 3],
      ["caisse-monnaie", 2],
      ["tenue-boutique", 2],
      ["approvisionnement-stock", 1],
      ["parler-langues-locales", 1],
      ["aide-commerce-familial", 1],
    ],
  },
  {
    slug: "developpement-web",
    libelle: "Développeur ou développeuse web",
    fragment: "en développement web",
    description:
      "Tu crées des sites et des applications web. Tu travailles pour des entreprises ou des clients.",
    famille: "diplome",
    zone: "urbaine",
    competences: [
      ["developpement-web", 3],
      ["utilisation-ordinateur", 2],
      ["resolution-problemes", 2],
      ["parler-anglais", 1],
      ["envie-apprendre", 2],
      ["graphisme", 1],
    ],
  },
  {
    slug: "community-management",
    libelle: "Community manager",
    fragment: "en réseaux sociaux",
    description:
      "Tu animes les pages d'une entreprise sur les réseaux sociaux. Tu publies, réponds aux messages et suis les résultats.",
    famille: "diplome",
    zone: "urbaine",
    competences: [
      ["reseaux-sociaux", 3],
      ["redaction-documents", 2],
      ["graphisme", 2],
      ["promotion-publicite", 2],
      ["usage-smartphone", 1],
      ["parler-francais", 2],
    ],
  },
  {
    slug: "plomberie",
    libelle: "Plombier ou plombière",
    fragment: "en plomberie",
    description:
      "Tu installes et répares les tuyaux, robinets et sanitaires. Tu interviens sur les chantiers et chez les particuliers.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["plomberie", 3],
      ["lecture-plans", 2],
      ["outillage-mesure", 2],
      ["travaux-chantier", 1],
      ["resolution-problemes", 1],
    ],
  },
  {
    slug: "maconnerie",
    libelle: "Maçon ou maçonne",
    fragment: "en maçonnerie",
    description:
      "Tu construis les murs, les dalles et les fondations. Tu travailles sur les chantiers.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["maconnerie", 3],
      ["travaux-chantier", 2],
      ["lecture-plans", 2],
      ["carrelage", 1],
      ["securite-travail", 2],
      ["travail-equipe", 1],
    ],
  },
  {
    slug: "menuiserie",
    libelle: "Menuisier ou menuisière",
    fragment: "en menuiserie",
    description:
      "Tu fabriques et répares des meubles, portes et fenêtres en bois. Tu travailles en atelier.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["travail-du-bois", 3],
      ["outillage-mesure", 2],
      ["lecture-plans", 1],
      ["securite-travail", 2],
      ["relation-client", 1],
    ],
  },
  {
    slug: "froid-climatisation",
    libelle: "Frigoriste",
    fragment: "en climatisation",
    description:
      "Tu installes et répares climatiseurs, réfrigérateurs et congélateurs. Tu interviens chez les clients.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["froid-climatisation", 3],
      ["electricite-batiment", 2],
      ["reparation-electronique", 1],
      ["securite-travail", 2],
      ["resolution-problemes", 1],
    ],
  },
  {
    slug: "esthetique",
    libelle: "Esthéticien ou esthéticienne",
    fragment: "en esthétique",
    description:
      "Tu fais les soins du visage, la manucure et le maquillage. Tu travailles en institut ou à domicile.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["esthetique-soins", 3],
      ["relation-client", 2],
      ["savonnerie-cosmetique", 1],
      ["vente-negociation", 1],
      ["ponctualite-serieux", 1],
    ],
  },
  {
    slug: "patisserie-restauration",
    libelle: "Pâtissier, cuisinier ou cuisinière",
    fragment: "en restauration",
    description:
      "Tu prépares des plats, du pain ou des gâteaux. Tu travailles en restaurant, en maquis ou à ton compte.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["cuisine-restauration", 3],
      ["patisserie-boulangerie", 3],
      ["hygiene-alimentaire", 3],
      ["vente-nourriture", 1],
      ["organisation-travail", 1],
    ],
  },
  {
    slug: "aviculture",
    libelle: "Aviculteur ou avicultrice",
    fragment: "en aviculture",
    description:
      "Tu élèves des poulets de chair ou des poules pondeuses. Tu surveilles leur santé et vends la production.",
    famille: "ouvert",
    zone: "rurale",
    competences: [
      ["aviculture", 3],
      ["elevage-petit-betail", 1],
      ["gestion-petite-activite", 2],
      ["vente-negociation", 1],
      ["organisation-travail", 1],
    ],
  },
  {
    slug: "maraichage",
    libelle: "Maraîcher ou maraîchère",
    fragment: "en maraîchage",
    description:
      "Tu cultives des légumes comme tomates, piments et légumes feuilles. Tu vends ta récolte au marché.",
    famille: "ouvert",
    zone: "rurale",
    competences: [
      ["maraichage", 3],
      ["cultures-vivrieres", 2],
      ["vente-negociation", 1],
      ["gestion-petite-activite", 1],
      ["organisation-travail", 1],
    ],
  },
  {
    slug: "reparation-telephones",
    libelle: "Réparateur ou réparatrice de téléphones",
    fragment: "en réparation de téléphones",
    description:
      "Tu répares les téléphones portables : écran, batterie, logiciel. Tu vends aussi des accessoires.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["reparation-telephone", 3],
      ["reparation-electronique", 2],
      ["usage-smartphone", 2],
      ["relation-client", 1],
      ["vente-negociation", 1],
    ],
  },
  {
    slug: "secretariat-bureautique",
    libelle: "Secrétaire bureautique",
    fragment: "en secrétariat",
    description:
      "Tu accueilles, saisis les documents et organises les dossiers d'un bureau. Tu gères le téléphone et le courrier.",
    famille: "diplome",
    zone: "urbaine",
    competences: [
      ["secretariat-accueil", 3],
      ["bureautique", 3],
      ["redaction-documents", 2],
      ["parler-francais", 2],
      ["organisation-travail", 1],
    ],
  },
  {
    slug: "logistique-livraison",
    libelle: "Livreur, livreuse ou agent logistique",
    fragment: "en livraison",
    description:
      "Tu livres des colis et des repas en ville, souvent à moto. Tu peux aussi préparer les commandes en entrepôt.",
    famille: "ouvert",
    zone: "urbaine",
    competences: [
      ["logistique-livraison", 3],
      ["conduite-vehicule", 3],
      ["ponctualite-serieux", 2],
      ["usage-smartphone", 1],
      ["relation-client", 1],
    ],
  },
  {
    slug: "photo-video",
    libelle: "Photographe et vidéaste",
    fragment: "en photo-vidéo",
    description:
      "Tu photographies et filmes les cérémonies et les événements. Tu fais le montage et livres les images.",
    famille: "ouvert",
    zone: "urbaine",
    competences: [
      ["photographie", 3],
      ["video-montage", 3],
      ["reseaux-sociaux", 1],
      ["relation-client", 2],
      ["utilisation-ordinateur", 1],
    ],
  },
  {
    slug: "installation-solaire",
    libelle: "Installateur ou installatrice solaire",
    fragment: "en énergie solaire",
    description:
      "Tu poses des panneaux solaires et des batteries. Tu entretiens les installations chez les clients.",
    famille: "artisanat",
    zone: "urbaine",
    competences: [
      ["energie-solaire", 3],
      ["electricite-batiment", 2],
      ["securite-travail", 2],
      ["calcul", 1],
      ["outillage-mesure", 1],
    ],
  },
];

export interface MetierSeed {
  id: string;
  pays: Pays;
  libelle: string;
  description: string;
  ouExiste: string;
  sourceUrl: string;
  famille: FamilleMetier;
  fragment: string;
  competences: Array<[string, 1 | 2 | 3]>;
}

const NOM_PAYS: Record<Pays, string> = { BJ: "du Bénin", TG: "du Togo" };

function ouExiste(pays: Pays, zone: Zone): string {
  const lieu =
    zone === "urbaine"
      ? `Grandes villes et zones urbaines ${NOM_PAYS[pays]}.`
      : `Zones rurales et périurbaines ${NOM_PAYS[pays]}.`;
  return `${lieu} ${A_VERIFIER}.`;
}

/**
 * Source d'une fiche métier : la page officielle la plus proche du métier.
 * Bénin : CQM pour l'artisanat, Azôli sinon. Togo : programme AIDE pour les métiers
 * à diplôme, accompagnement à la création d'activité de l'ANPE sinon.
 */
function sourceMetier(pays: Pays, famille: FamilleMetier): string {
  if (pays === "BJ") return famille === "artisanat" ? SOURCES.bjCqm : SOURCES.bjAzoli;
  return famille === "diplome" ? SOURCES.tgAide : SOURCES.tgEntrepreneuriat;
}

function decliner(pays: Pays): MetierSeed[] {
  const prefixe = pays === "BJ" ? "bj" : "tg";
  return CATALOGUE.map((m) => ({
    id: `${prefixe}-${m.slug}`,
    pays,
    libelle: m.libelle,
    description: m.description,
    ouExiste: ouExiste(pays, m.zone),
    sourceUrl: sourceMetier(pays, m.famille),
    famille: m.famille,
    fragment: m.fragment,
    competences: m.competences,
  }));
}

export const METIERS: MetierSeed[] = [...decliner("BJ"), ...decliner("TG")];

// Règles de détection de fraude (EF-10), communes aux deux pays.
// Les motifs s'appliquent au texte normalisé : minuscules, sans accents, espaces réduits,
// apostrophe droite. Les motifs MOT_CLE sont donc écrits sans accents ni majuscules, et
// les motifs REGEX sont des sources d'expressions régulières JavaScript sans drapeaux.
import type { CategorieFraude, TypeMotif } from "../../src/index";

export interface RegleFraudeSeed {
  id: string;
  motif: string;
  typeMotif: TypeMotif;
  categorie: CategorieFraude;
  description: string;
  bloquante: boolean;
  /** Exemples (déjà normalisés) qui doivent déclencher la règle : contrôlés au seed. */
  exemplesPositifs: string[];
  /** Exemples (déjà normalisés) qui ne doivent pas la déclencher. */
  exemplesNegatifs: string[];
}

export const REGLES_FRAUDE: RegleFraudeSeed[] = [
  // Frais demandés au candidat : refus de l'offre (RG-05).
  {
    id: "regle-frais-dossier",
    motif: "frais de dossier",
    typeMotif: "MOT_CLE",
    categorie: "FRAIS_CANDIDAT",
    description: "L'offre demande des frais de dossier au candidat.",
    bloquante: true,
    exemplesPositifs: ["deposez votre cv avec 5000 f de frais de dossier"],
    exemplesNegatifs: ["deposez votre dossier de candidature a l'accueil"],
  },
  {
    id: "regle-frais-inscription",
    motif: "frais d'inscription",
    typeMotif: "MOT_CLE",
    categorie: "FRAIS_CANDIDAT",
    description: "L'offre demande des frais d'inscription au candidat.",
    bloquante: true,
    exemplesPositifs: ["les frais d'inscription sont a regler avant le test"],
    exemplesNegatifs: ["inscription gratuite sur le site"],
  },
  {
    id: "regle-payer-pour-postuler",
    motif: "payer pour postuler",
    typeMotif: "MOT_CLE",
    categorie: "FRAIS_CANDIDAT",
    description: "L'offre demande de payer pour postuler.",
    bloquante: true,
    exemplesPositifs: ["il faut payer pour postuler a ce poste"],
    exemplesNegatifs: ["envoyez votre cv pour postuler"],
  },
  {
    id: "regle-frais-recrutement",
    motif: "frais de recrutement",
    typeMotif: "MOT_CLE",
    categorie: "FRAIS_CANDIDAT",
    description: "L'offre demande des frais de recrutement au candidat.",
    bloquante: true,
    exemplesPositifs: ["prevoir les frais de recrutement de 10 000 fcfa"],
    exemplesNegatifs: ["cabinet de recrutement agree"],
  },
  {
    id: "regle-versement-montant",
    motif: String.raw`\bverse(r|z)? (une somme de |la somme de )?\d[\d .]*\s?(f|fcfa|f cfa|francs?)\b(?! ?(par|chaque|/) ?mois)`,
    typeMotif: "REGEX",
    categorie: "FRAIS_CANDIDAT",
    description: "L'offre demande de verser une somme d'argent.",
    bloquante: true,
    exemplesPositifs: [
      "versez 5000 f pour valider votre place",
      "il faut verser 10 000 fcfa avant de commencer",
      "verse 2000f sur ce numero",
    ],
    exemplesNegatifs: [
      "le salaire est verse chaque fin de mois",
      "versez votre cv sur le site",
      "l'entreprise verse 60 000 fcfa par mois",
    ],
  },
  {
    id: "regle-paiement-avant-embauche",
    motif: String.raw`(paye(r|z)?|paie(r|z)?|regle(r|z)) (\S+ ){0,4}avant (l'embauche|le recrutement|la prise de poste)`,
    typeMotif: "REGEX",
    categorie: "FRAIS_CANDIDAT",
    description: "L'offre demande un paiement avant l'embauche.",
    bloquante: true,
    exemplesPositifs: ["vous devez payer 3000 f avant l'embauche"],
    exemplesNegatifs: ["la paie est versee apres le premier mois de travail"],
  },

  // Paiement exigé pour un entretien : refus de l'offre.
  {
    id: "regle-paiement-entretien",
    motif: String.raw`(paye(r|z)?|paie(r|z)?|verse(r|z)?|regle(r|z)|paiement)( \S+){0,4} (pour|avant|de) l'entretien`,
    typeMotif: "REGEX",
    categorie: "PAIEMENT_ENTRETIEN",
    description: "L'offre demande de payer pour passer l'entretien.",
    bloquante: true,
    exemplesPositifs: [
      "vous devez payer 2000 f pour l'entretien",
      "paiement obligatoire avant l'entretien",
    ],
    exemplesNegatifs: ["presentez-vous a l'entretien avec votre cv"],
  },
  {
    id: "regle-frais-entretien",
    motif: "frais d'entretien d'embauche",
    typeMotif: "MOT_CLE",
    categorie: "PAIEMENT_ENTRETIEN",
    description: "L'offre mentionne des frais pour l'entretien d'embauche.",
    bloquante: true,
    exemplesPositifs: ["prevoir les frais d'entretien d'embauche"],
    exemplesNegatifs: ["entretien d'embauche le lundi a 9 h"],
  },
  {
    id: "regle-frais-convocation",
    motif: "frais de convocation",
    typeMotif: "MOT_CLE",
    categorie: "PAIEMENT_ENTRETIEN",
    description: "L'offre demande des frais pour recevoir une convocation.",
    bloquante: true,
    exemplesPositifs: ["les frais de convocation sont a payer par mobile money"],
    exemplesNegatifs: ["vous recevrez une convocation par courriel"],
  },

  // Contact uniquement par WhatsApp : alerte pour le curateur.
  {
    id: "regle-whatsapp-uniquement",
    motif: String.raw`contact(ez|er)? (nous |moi )?(uniquement|seulement|exclusivement) (par|sur|via) whatsapp`,
    typeMotif: "REGEX",
    categorie: "WHATSAPP_SEUL",
    description: "L'offre impose un contact uniquement par WhatsApp.",
    bloquante: false,
    exemplesPositifs: [
      "contactez uniquement par whatsapp au numero indique",
      "contact seulement sur whatsapp",
    ],
    exemplesNegatifs: ["contactez le service des ressources humaines ou whatsapp"],
  },
  {
    id: "regle-whatsapp-seulement",
    motif: "whatsapp seulement",
    typeMotif: "MOT_CLE",
    categorie: "WHATSAPP_SEUL",
    description: "L'offre indique WhatsApp comme seul moyen de contact.",
    bloquante: false,
    exemplesPositifs: ["pas d'appel, whatsapp seulement"],
    exemplesNegatifs: ["envoyez votre cv par courriel"],
  },
  {
    id: "regle-whatsapp-uniquement-mot",
    motif: "whatsapp uniquement",
    typeMotif: "MOT_CLE",
    categorie: "WHATSAPP_SEUL",
    description: "L'offre indique WhatsApp comme seul moyen de contact.",
    bloquante: false,
    exemplesPositifs: ["ecrivez sur whatsapp uniquement"],
    exemplesNegatifs: ["ecrivez par courriel ou sur whatsapp"],
  },

  // Salaire irréaliste : alerte pour le curateur.
  {
    id: "regle-gain-par-jour-semaine",
    motif: String.raw`gagne(z|r)? (jusqu'a )?(\d{2,3} ?000 ?(f|fcfa|francs?)? ?(par|chaque|/) ?jour|\d{3} ?000 ?(f|fcfa|francs?)? ?(par|chaque|/) ?semaine)`,
    typeMotif: "REGEX",
    categorie: "SALAIRE_IRREALISTE",
    description: "L'offre promet un gain très élevé par jour ou par semaine.",
    bloquante: false,
    exemplesPositifs: [
      "gagnez 150 000 fcfa par semaine",
      "gagner jusqu'a 50000 f par jour",
      "gagne 200 000 f chaque jour",
    ],
    exemplesNegatifs: ["salaire de 60 000 fcfa par mois", "gagnez 25 000 fcfa par semaine"],
  },
  {
    id: "regle-sans-experience-salaire",
    motif: String.raw`sans experience.{0,60}salaire (eleve|important|de \d{3} ?000)`,
    typeMotif: "REGEX",
    categorie: "SALAIRE_IRREALISTE",
    description: "L'offre promet un salaire élevé sans aucune expérience.",
    bloquante: false,
    exemplesPositifs: [
      "sans experience requise, salaire eleve garanti",
      "sans experience, salaire de 500 000 par mois",
    ],
    exemplesNegatifs: ["sans experience, formation assuree, salaire selon la grille"],
  },
  {
    id: "regle-argent-facile",
    motif: "argent facile",
    typeMotif: "MOT_CLE",
    categorie: "SALAIRE_IRREALISTE",
    description: "L'offre promet de l'argent facile.",
    bloquante: false,
    exemplesPositifs: ["travail a domicile, argent facile"],
    exemplesNegatifs: ["gestion de l'argent de la caisse"],
  },
];

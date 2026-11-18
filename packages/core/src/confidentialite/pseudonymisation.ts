// Pseudonymisation appliquée à tout texte avant un appel à Gemini.
// Retire : e-mails, liens, numéros de téléphone et identifiants, adresses, noms de personnes.
//
// Limite connue : un nom propre cité sans contexte ("j'ai aidé Koffi") n'est pas détecté,
// sauf s'il figure dans la liste des noms connus (prénom du profil, nom Telegram).
// C'est une pseudonymisation, pas une anonymisation complète.
import { echapperRegex, normaliser } from "../texte";

export const JETON_NOM = "[NOM]";
export const JETON_TELEPHONE = "[TELEPHONE]";
export const JETON_NUMERO = "[NUMERO]";
export const JETON_EMAIL = "[EMAIL]";
export const JETON_LIEN = "[LIEN]";
export const JETON_ADRESSE = "[ADRESSE]";

export interface OptionsPseudonymisation {
  /** Noms connus à retirer : prénom du profil, prénom et nom du compte Telegram. */
  nomsConnus?: (string | null | undefined)[];
}

const LETTRE = "[\\p{L}]";
const MOT = `${LETTRE}[\\p{L}'-]*`;

// Mots qui ne peuvent pas être un nom après "je m'appelle" ou "chez".
const MOTS_OUTILS = new Set(
  [
    "et",
    "je",
    "j",
    "mais",
    "depuis",
    "pendant",
    "avec",
    "pour",
    "a",
    "au",
    "aux",
    "le",
    "la",
    "les",
    "un",
    "une",
    "des",
    "du",
    "de",
    "moi",
    "toi",
    "lui",
    "elle",
    "nous",
    "vous",
    "eux",
    "mon",
    "ma",
    "mes",
    "son",
    "sa",
    "ses",
    "qui",
    "que",
    "car",
    "donc",
    "ou",
    "en",
    "dans",
    "sur",
    "vers",
  ].map(normaliser),
);

const RELATIONS = [
  "patron",
  "patronne",
  "oncle",
  "tante",
  "maître",
  "maitre",
  "maîtresse",
  "patronne",
  "mère",
  "père",
  "frère",
  "soeur",
  "sœur",
  "cousin",
  "cousine",
  "ami",
  "amie",
  "chef",
  "tuteur",
  "tutrice",
  "formateur",
  "formatrice",
  "maman",
  "papa",
  "voisin",
  "voisine",
  "employeur",
  "client",
  "cliente",
  "mari",
  "femme",
  "fiancé",
  "fiancée",
];

const CIVILITES = [
  "M\\.",
  "Mr\\.?",
  "Mme\\.?",
  "Mlle\\.?",
  "Monsieur",
  "Madame",
  "Mademoiselle",
  "Dr\\.?",
  "Docteur",
  "Me\\.?",
  "El Hadj",
  "Hadja",
];

const DECLENCHEURS_NOM = [
  "je m'appelle",
  "je m’appelle",
  "mon nom est",
  "mon nom c'est",
  "mon prénom est",
  "mon prénom c'est",
  "moi c'est",
  "on m'appelle",
  "appelle-moi",
  "je me nomme",
];

const estMajuscule = (mot: string) => /^\p{Lu}/u.test(mot);
const estMotOutil = (mot: string) => MOTS_OUTILS.has(normaliser(mot));

/** Remplace les noms qui suivent une formule de présentation ("je m'appelle Koffi Mensah"). */
function retirerPresentations(texte: string): string {
  const declencheurs = DECLENCHEURS_NOM.map(echapperRegex).join("|");
  const motif = new RegExp(`(${declencheurs})\\s+(${MOT})(?:\\s+(${MOT}))?`, "giu");
  return texte.replace(motif, (_tout, declencheur: string, mot1: string, mot2?: string) => {
    if (estMotOutil(mot1)) return `${declencheur} ${mot1}${mot2 ? ` ${mot2}` : ""}`;
    if (mot2 && !estMotOutil(mot2) && estMajuscule(mot2)) return `${declencheur} ${JETON_NOM}`;
    return `${declencheur} ${JETON_NOM}${mot2 ? ` ${mot2}` : ""}`;
  });
}

/** Remplace les noms précédés d'une relation ("mon patron Akim", "chez Mama Rose"). */
function retirerRelations(texte: string): string {
  const relations = RELATIONS.map(echapperRegex).join("|");
  const motifRelation = new RegExp(
    `\\b((?:mon|ma|notre|le|la)\\s+(?:${relations}))\\s+(\\p{Lu}${MOT.slice(LETTRE.length)})(?:\\s+(\\p{Lu}[\\p{L}'-]*))?`,
    "gu",
  );
  let resultat = texte.replace(motifRelation, (_t, relation: string) => `${relation} ${JETON_NOM}`);

  // "chez" suivi d'un nom propre (majuscule) : patron, atelier, famille.
  const motifChez = new RegExp(
    `\\b([Cc]hez)\\s+(\\p{Lu}[\\p{L}'-]*)(?:\\s+(\\p{Lu}[\\p{L}'-]*))?`,
    "gu",
  );
  resultat = resultat.replace(motifChez, (tout, chez: string, mot1: string) =>
    estMotOutil(mot1) ? tout : `${chez} ${JETON_NOM}`,
  );
  return resultat;
}

/** Remplace les noms précédés d'une civilité ("Mme Adjovi", "Monsieur Agbo Paul"). */
function retirerCivilites(texte: string): string {
  const civilites = CIVILITES.join("|");
  const motif = new RegExp(
    `(?<![\\p{L}])(${civilites})\\s+(\\p{Lu}[\\p{L}'-]*)(?:\\s+(\\p{Lu}[\\p{L}'-]*))?`,
    "gu",
  );
  return texte.replace(motif, (_t, civilite: string) => `${civilite} ${JETON_NOM}`);
}

/** Remplace les noms connus du profil, sans tenir compte des accents ni de la casse. */
function retirerNomsConnus(texte: string, noms: string[]): string {
  let resultat = texte;
  for (const nom of noms) {
    for (const partie of nom.split(/\s+/)) {
      if (partie.length < 2) continue;
      // On construit un motif tolérant aux accents : chaque lettre accepte ses variantes.
      const motifLettres = [...normaliser(partie)]
        .map((c) => (/[a-z]/.test(c) ? `${c}\\p{M}*` : echapperRegex(c)))
        .join("");
      const motif = new RegExp(`(?<![\\p{L}])${motifLettres}(?![\\p{L}])`, "giu");
      resultat = resultat.normalize("NFD").replace(motif, JETON_NOM).normalize("NFC");
    }
  }
  return resultat;
}

/** Retire e-mails, liens, téléphones, identifiants numériques et adresses. */
function retirerCoordonnees(texte: string): string {
  return (
    texte
      // E-mails.
      .replace(/[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[a-z]{2,}/giu, JETON_EMAIL)
      // Liens (peuvent contenir un nom de profil).
      .replace(/\b(?:https?:\/\/|www\.)\S+/gi, JETON_LIEN)
      // Téléphones : indicatif facultatif (+229, +228, 00229...), puis 8 ou 10 chiffres
      // groupés par deux ou collés (formats du Bénin et du Togo).
      .replace(
        /(?<![\p{L}\p{N}])(?:(?:\+|00)\s?\d{3}[\s.-]?)?(?:\d{2}[\s.-]?){3,4}\d{2}(?![\p{L}\p{N}])/gu,
        JETON_TELEPHONE,
      )
      // Autres identifiants longs (pièce d'identité, IFU, compte) : 8 chiffres ou plus.
      .replace(/(?<![\p{L}\p{N}])\d{8,}(?![\p{L}\p{N}])/gu, JETON_NUMERO)
      // Boîtes postales.
      .replace(/\b(?:B\.?\s?P\.?|bo[iî]te postale)\s*\d+/giu, JETON_ADRESSE)
      // Voies : "rue 12.345", "avenue Steinmetz", "von de la pharmacie"... jusqu'à la ponctuation.
      .replace(/\b(?:rue|avenue|boulevard|bd|ruelle|von|impasse)\b[^,.;!?\n]*/giu, JETON_ADRESSE)
      // Carré, lot, parcelle, maison, villa, immeuble suivis d'un numéro ou d'un nom.
      .replace(
        /\b(?:carr[ée]|lot|parcelle|maison|villa|immeuble)\s*(?:n[°o]?\.?\s*)?(?:\d+[a-z]?|\p{Lu}[\p{L}'-]*)/gu,
        JETON_ADRESSE,
      )
      // Quartier précis.
      .replace(
        /\b([Qq]uartier)\s+(\p{Lu}[\p{L}'-]*(?:\s+\p{Lu}[\p{L}'-]*)?)/gu,
        `$1 ${JETON_ADRESSE}`,
      )
  );
}

/** Pseudonymise un texte avant tout envoi à l'IA. */
export function pseudonymiser(texte: string, options: OptionsPseudonymisation = {}): string {
  const noms = (options.nomsConnus ?? []).filter((n): n is string => !!n && n.trim().length > 1);
  let resultat = texte.normalize("NFC");
  resultat = retirerCoordonnees(resultat);
  resultat = retirerPresentations(resultat);
  resultat = retirerCivilites(resultat);
  resultat = retirerRelations(resultat);
  resultat = retirerNomsConnus(resultat, noms);
  return resultat.replace(/[ \t]+/g, " ").trim();
}

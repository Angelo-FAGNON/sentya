// RG-08 : ne jamais stocker de données sensibles (santé, religion, origine ethnique,
// opinions politiques). Toute phrase qui en contient est retirée AVANT l'enregistrement
// et avant tout appel à l'IA. On préfère perdre une phrase utile que garder une donnée sensible.
import { decouperPhrases, normaliser } from "../texte";

export type CategorieSensible = "SANTE" | "RELIGION" | "ORIGINE_ETHNIQUE" | "POLITIQUE";

// Les motifs s'appliquent au texte normalisé (minuscules, sans accents).
const MOTIFS: Record<CategorieSensible, RegExp[]> = {
  SANTE: [
    /\b(vih|sida|seropositi\w*|malade|maladie\w*|handicap\w*|enceinte|grossesse|diabet\w*|drepanocyt\w*|epilep\w*|tuberculose|hepatite|cancer\w*|depression|hospitalise\w*|infirmite|paralys\w*|aveugle\w*|sourde?s?|muet\w*|medicament\w*|ordonnance medicale|traitement medical)\b/,
  ],
  RELIGION: [
    /\b(musulman\w*|chretien\w*|catholique\w*|protestant\w*|evangeli\w*|pentecot\w*|christianisme|celeste|vodou\w*|vodun|vaudou\w*|islam\w*|mosquee\w*|eglise\w*|temple|culte|prieres?|pasteur\w*|imam\w*|religion\w*|religieu\w*|athee\w*|animiste\w*|fetich\w*|ramadan|careme|confession religieuse)\b/,
  ],
  ORIGINE_ETHNIQUE: [
    /\b(ethnie\w*|tribu\w*|ethnique\w*|race)\b/,
    // L'appartenance déclarée est sensible ; parler une langue ("je parle fon") ne l'est pas.
    /\b(je suis|mes parents sont|ma famille est|mon pere est|ma mere est|d'origine|originaire)\s+(une?\s+)?(fon|yoruba|goun|gun|adja|mina|bariba|dendi|peulh?s?|haoussa|ditammari|somba|ewe|kabye|kotokoli|tem|moba|losso|nawdba|mahi|xwla|holli|nago|lokpa|yom|tchamba|bassar\w*|ife|ana)\b/,
  ],
  POLITIQUE: [
    /\b(parti politique|partis politiques|militant\w*|opposition|syndica\w*|elections?|electeur\w*|electorale?s?|voter|depute\w*|mouvance|politique\w*|manifestation\w*)\b/,
  ],
};

export interface ResultatFiltre {
  /** Texte débarrassé des phrases sensibles. */
  texte: string;
  /** Vrai si au moins une phrase a été retirée. */
  retire: boolean;
  categories: CategorieSensible[];
}

/** Indique les catégories sensibles présentes dans une phrase. */
export function detecterCategories(phrase: string): CategorieSensible[] {
  const n = normaliser(phrase);
  return (Object.keys(MOTIFS) as CategorieSensible[]).filter((categorie) =>
    MOTIFS[categorie].some((motif) => motif.test(n)),
  );
}

/** Retire les phrases contenant des données sensibles (RG-08). */
export function filtrerDonneesSensibles(texte: string): ResultatFiltre {
  const categories = new Set<CategorieSensible>();
  const gardees: string[] = [];
  for (const phrase of decouperPhrases(texte)) {
    const trouvees = detecterCategories(phrase);
    if (trouvees.length > 0) {
      trouvees.forEach((c) => categories.add(c));
    } else {
      gardees.push(phrase);
    }
  }
  return { texte: gardees.join(" "), retire: categories.size > 0, categories: [...categories] };
}

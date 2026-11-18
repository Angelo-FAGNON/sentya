// Outils de texte partagés : normalisation pour les comparaisons, découpage en phrases.

/** Minuscules, sans accents, espaces réduits : base de toutes les comparaisons. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Découpe un texte en phrases (ponctuation forte ou retour à la ligne). */
export function decouperPhrases(texte: string): string[] {
  return texte
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function compterMots(phrase: string): number {
  return phrase.split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
}

/** Échappe une chaîne pour l'insérer dans une expression régulière. */
export function echapperRegex(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cherche un terme dans un texte normalisé, en respectant les limites de mots.
 * Le terme est lui-même normalisé (accents et casse ignorés).
 */
export function contientTerme(texteNormalise: string, terme: string): boolean {
  const t = normaliser(terme);
  if (!t) return false;
  const motif = new RegExp(`(?<![\\p{L}\\p{N}])${echapperRegex(t)}(?![\\p{L}\\p{N}])`, "u");
  return motif.test(texteNormalise);
}

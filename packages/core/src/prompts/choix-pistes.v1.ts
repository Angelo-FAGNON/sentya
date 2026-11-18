// Prompt système : choix de 3 pistes parmi les métiers présélectionnés en code.
// L'IA ne voit ni prénom ni texte libre : seulement des données structurées et neutres,
// ce qui garantit l'égalité de traitement (deux profils identiques donnent la même entrée).

export const PROMPT_CHOIX_PISTES = {
  id: "choix-pistes",
  version: "choix-pistes@1",
  systeme: `Tu aides un jeune du Bénin ou du Togo à choisir 3 pistes professionnelles réalistes.

Règles strictes :
1. Tu choisis UNIQUEMENT parmi les métiers de la liste "candidats", par leur identifiant exact.
2. Pour chaque piste, "voie" fait partie des "voiesDisponibles" de ce métier.
3. Tu proposes 3 pistes différentes, les plus réalistes d'abord.
4. "raison" : une phrase de 20 mots maximum, au tutoiement, qui cite une activité ou une compétence du jeune.
5. "conditionPrincipale" : une phrase de 15 mots maximum, la principale chose à réunir pour avancer.
6. Tu n'écris JAMAIS de prix, de salaire, de durée, d'adresse, de numéro, de nom d'organisme ni de lien.
7. Tu ne promets jamais de résultat : pas de "garanti", "sûr", "assuré". C'est une suggestion.
8. Tu tiens compte de l'objectif du jeune et de son niveau d'études, sans jamais le juger.

Tu réponds uniquement avec le JSON demandé.`,
};

export interface CandidatPourIA {
  metierId: string;
  libelle: string;
  description: string;
  competencesCommunes: string[];
  voiesDisponibles: string[];
}

export interface EntreeChoixPistes {
  pays: string;
  objectif: string | null;
  niveauEtudes: string | null;
  competences: string[];
  activites: { libelle: string; dureeMois: number | null }[];
  candidats: CandidatPourIA[];
}

/**
 * Sérialise l'entrée de façon déterministe (ordre des clés et des listes fixé),
 * pour que deux profils équivalents produisent exactement la même requête.
 */
export function construireEntreeChoixPistes(entree: EntreeChoixPistes): string {
  return JSON.stringify({
    pays: entree.pays,
    objectif: entree.objectif,
    niveauEtudes: entree.niveauEtudes,
    competences: [...entree.competences].sort(),
    activites: [...entree.activites].sort((a, b) => a.libelle.localeCompare(b.libelle)),
    candidats: entree.candidats.map((c) => ({
      metierId: c.metierId,
      libelle: c.libelle,
      description: c.description,
      competencesCommunes: [...c.competencesCommunes].sort(),
      voiesDisponibles: c.voiesDisponibles,
    })),
  });
}

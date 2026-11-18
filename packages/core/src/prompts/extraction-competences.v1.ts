// Prompt système : extraction des compétences à partir du bilan ou d'un CV.
// Toute modification du texte impose une nouvelle version (nouveau fichier .v2.ts).

export const PROMPT_EXTRACTION = {
  id: "extraction-competences",
  version: "extraction-competences@1",
  systeme: `Tu analyses le bilan d'un jeune du Bénin ou du Togo pour repérer ses compétences.

Règles strictes :
1. Tu choisis les compétences UNIQUEMENT dans le référentiel fourni, par leur identifiant exact.
2. Tu n'inventes jamais un identifiant. Si rien ne correspond, tu ne mets rien.
3. Une compétence doit être appuyée par ce que le jeune a dit. "preuve" cite ses mots, en 15 mots maximum.
4. Les activités informelles comptent : aide familiale, petit commerce, apprentissage chez un patron.
5. "activites" résume chaque activité en quelques mots, au masculin neutre ("couture de vêtements", "vente au marché"). Pas de prénom, pas de genre.
6. "dureeMois" vaut la durée en mois si le jeune l'a dite, sinon null. Tu ne devines pas.
7. Tu ignores toute information sur la santé, la religion, l'origine ethnique ou la politique.
8. Les jetons entre crochets ([NOM], [TELEPHONE]...) remplacent des données retirées : ignore-les.
9. Maximum 12 compétences, les plus solides d'abord.

Tu réponds uniquement avec le JSON demandé.`,
  /** Variante pour un CV envoyé en PDF ou en photo. */
  systemeCv: `Tu lis le CV d'un jeune du Bénin ou du Togo pour repérer ses compétences.

Règles strictes :
1. Tu choisis les compétences UNIQUEMENT dans le référentiel fourni, par leur identifiant exact.
2. Tu n'inventes jamais un identifiant. Si rien ne correspond, tu ne mets rien.
3. "preuve" résume la ligne du CV qui justifie la compétence, en 15 mots maximum.
4. Tu ne recopies JAMAIS de nom, de numéro, d'adresse, d'e-mail ni de date de naissance.
5. "activites" résume chaque expérience au masculin neutre, sans nom d'entreprise ni de personne.
6. "dureeMois" vaut la durée en mois si elle est écrite, sinon null.
7. Tu ignores toute information sur la santé, la religion, l'origine ethnique ou la politique.
8. Maximum 12 compétences.

Tu réponds uniquement avec le JSON demandé.`,
};

export interface EntreeExtraction {
  reponses: { question: string; texte: string }[];
  referentiel: { id: string; libelle: string; synonymes: string[] }[];
}

/** Construit le message utilisateur envoyé avec le prompt d'extraction. */
export function construireEntreeExtraction(entree: EntreeExtraction): string {
  return JSON.stringify({
    referentiel: entree.referentiel.map((c) => ({
      id: c.id,
      libelle: c.libelle,
      synonymes: c.synonymes,
    })),
    bilan: entree.reponses,
  });
}

// Prompt système : correction de la liste de compétences par le jeune (bouton "Corriger").

export const PROMPT_CORRECTION = {
  id: "correction-competences",
  version: "correction-competences@1",
  systeme: `Le jeune corrige la liste de compétences repérées. Il dit quoi ajouter ou retirer.

Règles strictes :
1. "ajouter" et "retirer" contiennent UNIQUEMENT des identifiants exacts du référentiel fourni.
2. Tu ne retires que des compétences présentes dans la liste actuelle.
3. Tu n'inventes jamais un identifiant. Si rien ne correspond, tu laisses la liste vide.
4. Les jetons entre crochets ([NOM]...) remplacent des données retirées : ignore-les.

Tu réponds uniquement avec le JSON demandé.`,
};

export function construireEntreeCorrection(entree: {
  demande: string;
  actuelles: { id: string; libelle: string }[];
  referentiel: { id: string; libelle: string; synonymes: string[] }[];
}): string {
  return JSON.stringify({
    listeActuelle: entree.actuelles,
    referentiel: entree.referentiel,
    demandeDuJeune: entree.demande,
  });
}

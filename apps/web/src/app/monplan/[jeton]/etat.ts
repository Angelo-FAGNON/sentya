// État affiché par la page du lien magique.
export type EtatPlan =
  | { statut: "initial" }
  | { statut: "expire" }
  | { statut: "sans_plan" }
  | {
      statut: "plan";
      metier: string;
      voie: string;
      etapes: {
        ordre: number;
        titre: string;
        details: string;
        echeance: string;
        statut: string;
        source: string;
      }[];
    };

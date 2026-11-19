import type { Competence } from "@sentya/db";
import { Champ, Formulaire, ZoneTexte } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";

export function FormulaireCompetence({
  action,
  competence,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  competence?: Competence;
}) {
  return (
    <Formulaire action={action} libelleBouton={competence ? "Enregistrer" : "Créer la compétence"}>
      {competence ? (
        <p>
          Identifiant : <code className="font-mono">{competence.id}</code> (non modifiable).
        </p>
      ) : (
        <Champ
          nom="id"
          libelle="Identifiant"
          requis
          aide="Minuscules, chiffres et tirets. Par exemple : couture-retouche."
        />
      )}
      <Champ nom="libelle" libelle="Libellé" valeur={competence?.libelle} requis />
      <ZoneTexte
        nom="synonymes"
        libelle="Synonymes"
        valeur={competence?.synonymes.join(", ")}
        lignes={2}
        aide="Séparés par des virgules. Par exemple : coudre, je couds les habits."
      />
      <Champ nom="domaine" libelle="Domaine" valeur={competence?.domaine} requis />
    </Formulaire>
  );
}

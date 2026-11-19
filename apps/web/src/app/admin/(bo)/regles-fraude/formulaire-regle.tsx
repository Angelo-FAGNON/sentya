import type { RegleFraude } from "@sentya/db";
import { CaseACocher, Champ, Formulaire, Groupe, Liste } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";
import {
  CATEGORIES_FRAUDE,
  LIBELLE_CATEGORIE_FRAUDE,
  LIBELLE_TYPE_MOTIF,
  TYPES_MOTIF,
} from "@/lib/valeurs";

export function FormulaireRegle({
  action,
  regle,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  regle?: RegleFraude;
}) {
  return (
    <Formulaire action={action} libelleBouton={regle ? "Enregistrer" : "Créer la règle"}>
      <Groupe
        nom="typeMotif"
        legende="Type de motif"
        type="radio"
        requis
        options={TYPES_MOTIF.map((t) => ({ valeur: t, libelle: LIBELLE_TYPE_MOTIF[t] }))}
        valeurs={[regle?.typeMotif ?? "MOT_CLE"]}
      />
      <Champ
        nom="motif"
        libelle="Motif"
        valeur={regle?.motif}
        requis
        aide="Mot-clé : cherché sans tenir compte des accents ni des majuscules. Expression régulière : appliquée au texte en minuscules sans accents."
      />
      <Liste
        nom="categorie"
        libelle="Catégorie"
        requis
        valeur={regle?.categorie ?? "FRAIS_CANDIDAT"}
        options={CATEGORIES_FRAUDE.map((c) => ({
          valeur: c,
          libelle: LIBELLE_CATEGORIE_FRAUDE[c],
        }))}
      />
      <Champ
        nom="description"
        libelle="Description affichée au curateur"
        valeur={regle?.description}
        requis
      />
      <CaseACocher
        nom="bloquante"
        libelle="Règle bloquante"
        coche={regle?.bloquante ?? false}
        aide="L'offre est refusée si elle déclenche cette règle (frais demandés au candidat, RG-05)."
      />
      <CaseACocher nom="actif" libelle="Règle active" coche={regle?.actif ?? true} />
    </Formulaire>
  );
}

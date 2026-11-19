import type { Formation } from "@sentya/db";
import { ChampsFiche } from "@/composants/fiche";
import { Champ, Formulaire } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";

export function FormulaireFormation({
  action,
  formation,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  formation?: Formation;
}) {
  return (
    <Formulaire action={action} libelleBouton={formation ? "Enregistrer" : "Créer la formation"}>
      <Champ nom="intitule" libelle="Intitulé" valeur={formation?.intitule} requis />
      <Champ nom="organisme" libelle="Organisme" valeur={formation?.organisme} requis />
      <Champ
        nom="dureeIndicative"
        libelle="Durée indicative"
        valeur={formation?.dureeIndicative ?? "À vérifier par le curateur"}
        requis
        aide="Par exemple : 6 mois."
      />
      <Champ
        nom="coutIndicatifFcfa"
        libelle="Coût indicatif en FCFA"
        inputMode="numeric"
        valeur={formation?.coutIndicatifFcfa ?? ""}
        aide="Laisse vide si le coût n'est pas confirmé : le jeune verra « À vérifier par le curateur »."
      />
      <ChampsFiche valeurs={formation} />
    </Formulaire>
  );
}

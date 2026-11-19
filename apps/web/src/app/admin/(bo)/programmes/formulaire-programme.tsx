// Formulaire court d'un programme : l'essentiel en haut, la source et la vérification ensuite.
import type { Programme } from "@sentya/db";
import { ChampsFiche } from "@/composants/fiche";
import { Champ, Formulaire, Groupe, ZoneTexte } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";
import { LIBELLE_VOIE, VOIES } from "@/lib/valeurs";

const OPTIONS_VOIES = VOIES.map((v) => ({ valeur: v, libelle: LIBELLE_VOIE[v] }));

export function FormulaireProgramme({
  action,
  programme,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  programme?: Programme;
}) {
  return (
    <Formulaire action={action} libelleBouton={programme ? "Enregistrer" : "Créer le programme"}>
      <Champ nom="nom" libelle="Nom du programme" valeur={programme?.nom} requis />
      <ZoneTexte
        nom="conditions"
        libelle="Conditions"
        valeur={programme?.conditions}
        requis
        lignes={3}
      />
      <Champ nom="contact" libelle="Contact" valeur={programme?.contact} requis />
      <ZoneTexte
        nom="publicCible"
        libelle="Public visé"
        valeur={programme?.publicCible}
        requis
        lignes={2}
      />
      <ZoneTexte nom="description" libelle="Description" valeur={programme?.description} requis />
      <Groupe
        nom="voies"
        legende="Voies concernées"
        options={OPTIONS_VOIES}
        valeurs={programme?.voies ?? ["EMPLOI"]}
        requis
      />
      <ChampsFiche valeurs={programme} />
    </Formulaire>
  );
}

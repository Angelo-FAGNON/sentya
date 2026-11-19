import type { Metadata } from "next";
import { CadrePublic } from "@/composants/cadre-public";
import { Champ, Formulaire, Groupe, Liste } from "@/composants/formulaire";
import { MOT_DE_PASSE_MIN } from "@/lib/schemas";
import { LIBELLE_PAYS, LIBELLE_TYPE_PARTENAIRE, PAYS, TYPES_PARTENAIRE } from "@/lib/valeurs";
import { inscrirePartenaire } from "../actions";

export const metadata: Metadata = { title: "Devenir partenaire" };

export default function InscriptionPartenaire() {
  return (
    <CadrePublic>
      <h1 className="text-3xl font-bold">Devenir partenaire de Sentya</h1>
      <p className="mt-4">
        Centre de formation ou employeur : propose tes offres aux jeunes. Un administrateur valide
        chaque organisation à la main.
      </p>
      <div className="mt-8 max-w-xl">
        <Formulaire action={inscrirePartenaire} libelleBouton="Envoyer ma demande">
          <fieldset className="space-y-4 rounded border border-slate-300 p-4">
            <legend className="px-1 font-bold">Organisation</legend>
            <Groupe
              nom="type"
              legende="Type d'organisation"
              type="radio"
              requis
              options={TYPES_PARTENAIRE.map((t) => ({
                valeur: t,
                libelle: LIBELLE_TYPE_PARTENAIRE[t],
              }))}
            />
            <Champ nom="nom" libelle="Nom de l'organisation" requis autoComplete="organization" />
            <Liste
              nom="pays"
              libelle="Pays"
              requis
              optionVide="Choisis un pays"
              options={PAYS.map((p) => ({ valeur: p, libelle: LIBELLE_PAYS[p] }))}
            />
            <Champ
              nom="contactOfficiel"
              libelle="Contact officiel"
              requis
              aide="Téléphone, adresse ou site officiel, pour vérifier ton organisation."
            />
          </fieldset>
          <fieldset className="space-y-4 rounded border border-slate-300 p-4">
            <legend className="px-1 font-bold">Compte de connexion</legend>
            <Champ nom="email" libelle="E-mail" type="email" requis autoComplete="email" />
            <Champ
              nom="motDePasse"
              libelle="Mot de passe"
              type="password"
              requis
              autoComplete="new-password"
              aide={`${MOT_DE_PASSE_MIN} caractères au minimum.`}
            />
            <Champ
              nom="confirmation"
              libelle="Confirme le mot de passe"
              type="password"
              requis
              autoComplete="new-password"
            />
          </fieldset>
        </Formulaire>
      </div>
      <p className="mt-8">
        Déjà inscrit ? <a href="/partenaire/connexion">Se connecter</a>
      </p>
    </CadrePublic>
  );
}

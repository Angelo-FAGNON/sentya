import type { Metadata } from "next";
import { CadrePublic } from "@/composants/cadre-public";
import { Champ, Formulaire } from "@/composants/formulaire";
import { connecterPartenaire } from "../actions";

export const metadata: Metadata = { title: "Espace partenaire", robots: { index: false } };

export default function ConnexionPartenaire() {
  return (
    <CadrePublic>
      <h1 className="text-3xl font-bold">Espace partenaire</h1>
      <div className="mt-6 max-w-md">
        <Formulaire
          action={connecterPartenaire}
          libelleBouton="Se connecter"
          libelleEnCours="Connexion..."
        >
          <Champ nom="email" libelle="E-mail" type="email" requis autoComplete="username" />
          <Champ
            nom="motDePasse"
            libelle="Mot de passe"
            type="password"
            requis
            autoComplete="current-password"
          />
        </Formulaire>
      </div>
      <p className="mt-8">
        Pas encore de compte ? <a href="/partenaire/inscription">Devenir partenaire</a>
      </p>
    </CadrePublic>
  );
}

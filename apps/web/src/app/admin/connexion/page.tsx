import type { Metadata } from "next";
import { Champ, Formulaire } from "@/composants/formulaire";
import { connecterAdmin } from "../actions-session";

export const metadata: Metadata = { title: "Connexion au back-office", robots: { index: false } };

export default async function ConnexionAdmin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { info } = await searchParams;
  return (
    <main id="contenu" tabIndex={-1} className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Connexion au back-office</h1>
      {info === "2fa" ? (
        <p role="status" className="mt-4 rounded border-l-4 border-emerald-700 bg-emerald-50 p-3">
          La double authentification est active. Connecte-toi avec ton code à 6 chiffres.
        </p>
      ) : null}
      <div className="mt-6">
        <Formulaire
          action={connecterAdmin}
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
          <Champ
            nom="code"
            libelle="Code à 6 chiffres"
            inputMode="numeric"
            autoComplete="one-time-code"
            aide="Code de ton application d'authentification. Laisse vide pour ta toute première connexion."
          />
        </Formulaire>
      </div>
      <p className="mt-8 text-sm">
        Tu représentes une organisation partenaire ?{" "}
        <a href="/partenaire/connexion">Espace partenaire</a>
      </p>
    </main>
  );
}

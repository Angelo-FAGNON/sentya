// Enrôlement obligatoire de la double authentification à la première connexion.
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { Champ, Formulaire } from "@/composants/formulaire";
import { env } from "@/env";
import { chiffrer, dechiffrer } from "@/lib/chiffrement";
import { exigerAdminPourEnrolement } from "@/lib/garde";
import { nouveauSecretTotp, uriTotp } from "@/lib/totp";
import { deconnecter } from "../actions-session";
import { confirmerTotp } from "./actions";

export const metadata: Metadata = { title: "Double authentification", robots: { index: false } };

function BoutonDeconnexion() {
  return (
    <form action={deconnecter} className="mt-6">
      <button type="submit" className="bouton-secondaire">
        Se déconnecter
      </button>
    </form>
  );
}

export default async function DoubleAuthentification() {
  const { session, compte } = await exigerAdminPourEnrolement();

  if (compte.totpActive) {
    return (
      <main id="contenu" tabIndex={-1} className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-2xl font-bold">Double authentification</h1>
        {session.totpRequis ? (
          <p className="mt-4">
            La double authentification est déjà active sur ce compte. Reconnecte-toi avec ton code à
            6 chiffres.
          </p>
        ) : (
          <p className="mt-4">
            La double authentification est active. <a href="/admin">Retour au tableau de bord</a>
          </p>
        )}
        <BoutonDeconnexion />
      </main>
    );
  }

  // Le secret est créé une seule fois, chiffré en base, tant que l'enrôlement n'est pas confirmé.
  const cle = env().AUTH_SECRET;
  let secretChiffre = compte.totpSecret;
  if (!secretChiffre) {
    secretChiffre = chiffrer(nouveauSecretTotp(), cle);
    await getPrisma().adminUser.update({
      where: { id: compte.id },
      data: { totpSecret: secretChiffre },
    });
  }
  const secret = dechiffrer(secretChiffre, cle);
  const svg = await QRCode.toString(uriTotp(secret, compte.email), {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const secretLisible = secret.match(/.{1,4}/g)?.join(" ") ?? secret;

  return (
    <main id="contenu" tabIndex={-1} className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Active la double authentification</h1>
      <p className="mt-4">
        Elle est obligatoire pour accéder au back-office. Il te faut une application
        d&apos;authentification sur ton téléphone.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-6">
        <li>Ouvre ton application d&apos;authentification.</li>
        <li>Scanne le code QR ci-dessous, ou saisis la clé à la main.</li>
        <li>Saisis le code à 6 chiffres affiché par l&apos;application.</li>
      </ol>
      <div
        role="img"
        aria-label="Code QR à scanner avec ton application d'authentification. La clé est aussi écrite en dessous."
        className="mt-6 h-56 w-56 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="mt-4">
        Clé à saisir à la main :{" "}
        <code className="break-all font-mono text-lg">{secretLisible}</code>
      </p>
      <div className="mt-6">
        <Formulaire action={confirmerTotp} libelleBouton="Activer la double authentification">
          <Champ
            nom="code"
            libelle="Code à 6 chiffres"
            requis
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </Formulaire>
      </div>
      <BoutonDeconnexion />
    </main>
  );
}

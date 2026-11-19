// En-tête, contenu principal et pied de page des pages publiques.
// Liens HTML simples pour la navigation ; seuls l'en-tête et l'exemple de conversation
// de l'accueil utilisent du JavaScript client.
import type { ReactNode } from "react";
import { env } from "@/env";
import { lienTelegram } from "@/lib/telegram";
import { accueil } from "@/lib/textes-publics";
import { EntetePublic } from "./entete-public";
import { Icone, SpriteIcones } from "./icones";

export function CadrePublic({
  children,
  pleineLargeur = false,
}: {
  children: ReactNode;
  /** Vrai pour la page d'accueil, qui gère elle-même ses marges. */
  pleineLargeur?: boolean;
}) {
  const lienBot = lienTelegram(env().TELEGRAM_BOT_USERNAME, "site");
  return (
    <div className="flex min-h-screen flex-col">
      <SpriteIcones />
      <EntetePublic
        lienBot={lienBot}
        navigation={accueil.navigation}
        canaux={accueil.canaux}
        boutonCourt={accueil.boutonCourt}
        bouton={accueil.bouton}
      />
      <main
        id="contenu"
        tabIndex={-1}
        className={pleineLargeur ? "accueil flex-1" : "mx-auto w-full max-w-3xl flex-1 px-4 py-8"}
      >
        {children}
      </main>
      <footer className="pied">
        <div className="conteneur">
          <a href="/" className="marque" aria-label="Sentya, accueil">
            <Icone nom="marque" />
            Sentya
          </a>
          <nav aria-label="Informations légales">
            <ul>
              <li>
                <a href="/confidentialite">Confidentialité</a>
              </li>
              <li>
                <a href="/conditions">Conditions d&apos;utilisation</a>
              </li>
              <li>
                <a href="/suppression">Supprimer mes données</a>
              </li>
              <li>
                <a href="/partenaire/connexion">Espace partenaire</a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** Page de texte simple : titre, introduction et sections. */
export function PageTexte({
  titre,
  intro,
  sections,
}: {
  titre: string;
  intro: string;
  sections: { titre: string; paragraphes: string[] }[];
}) {
  return (
    <CadrePublic>
      <h1 className="text-3xl font-bold">{titre}</h1>
      <p className="mt-4 text-lg">{intro}</p>
      {sections.map((section) => (
        <section key={section.titre} className="mt-8">
          <h2 className="text-xl font-semibold">{section.titre}</h2>
          {section.paragraphes.map((paragraphe) => (
            <p key={paragraphe} className="mt-2">
              {paragraphe}
            </p>
          ))}
        </section>
      ))}
    </CadrePublic>
  );
}

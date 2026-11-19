// En-tête, contenu principal et pied de page des pages publiques.
// Liens HTML simples : pas de préchargement, pas de JavaScript client.
import type { ReactNode } from "react";

export function CadrePublic({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <a href="/" className="text-xl font-bold text-emerald-900 no-underline">
            Sentya
          </a>
        </div>
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-300 bg-slate-50">
        <nav aria-label="Informations légales" className="mx-auto max-w-3xl px-4 py-4">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
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

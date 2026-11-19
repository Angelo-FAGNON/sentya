// Cadre de l'espace partenaire. Chaque page et chaque action revérifient le compte.
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { exigerPartenaire } from "@/lib/garde";
import { deconnecter } from "../../admin/actions-session";

export const metadata: Metadata = {
  title: { default: "Espace partenaire", template: "%s | Espace partenaire Sentya" },
  robots: { index: false, follow: false },
};

export default async function CadrePartenaire({ children }: { children: ReactNode }) {
  const { email, partenaire } = await exigerPartenaire();
  const valide = partenaire.statutValidation === "VALIDE";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-300 bg-emerald-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <p className="text-lg font-bold">Sentya, espace partenaire : {partenaire.nom}</p>
          <div className="flex items-center gap-4 text-sm">
            <span>{email}</span>
            <form action={deconnecter}>
              <button
                type="submit"
                className="rounded border border-white px-3 py-1 font-semibold hover:bg-emerald-800"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
        {valide ? (
          <nav aria-label="Espace partenaire" className="mx-auto max-w-5xl px-4 pb-3">
            <ul className="flex flex-wrap gap-4">
              <li>
                <Link href="/partenaire" className="text-white hover:text-white">
                  Mes opportunités
                </Link>
              </li>
              <li>
                <Link
                  href="/partenaire/opportunites/nouvelle"
                  className="text-white hover:text-white"
                >
                  Publier une opportunité
                </Link>
              </li>
              <li>
                <Link href="/partenaire/candidatures" className="text-white hover:text-white">
                  Candidatures reçues
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
      </header>
      <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

// Cadre du back-office : navigation selon le rôle, bandeau rouge si une revue de
// signalement dépasse 48 heures (RG-06). Chaque page refait sa propre vérification de rôle.
import { alertesRevueEnRetard } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { exigerAdmin } from "@/lib/garde";
import { aLaPermission, type Permission } from "@/lib/roles";
import { LIBELLE_ROLE } from "@/lib/valeurs";
import { deconnecter } from "../actions-session";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s | Back-office Sentya" },
  robots: { index: false, follow: false },
};

const LIENS: { href: string; libelle: string; permission: Permission }[] = [
  { href: "/admin", libelle: "Tableau de bord", permission: "tableau" },
  { href: "/admin/metiers", libelle: "Métiers", permission: "referentiel" },
  { href: "/admin/competences", libelle: "Compétences", permission: "referentiel" },
  { href: "/admin/formations", libelle: "Formations", permission: "referentiel" },
  { href: "/admin/programmes", libelle: "Programmes", permission: "referentiel" },
  { href: "/admin/modeles-etapes", libelle: "Modèles d'étapes", permission: "referentiel" },
  { href: "/admin/opportunites", libelle: "Opportunités", permission: "referentiel" },
  { href: "/admin/regles-fraude", libelle: "Règles de fraude", permission: "referentiel" },
  { href: "/admin/signalements", libelle: "Signalements", permission: "signalements" },
  { href: "/admin/revue", libelle: "Revue qualité", permission: "revue" },
  { href: "/admin/partenaires", libelle: "Partenaires", permission: "partenaires" },
  { href: "/admin/utilisateurs", libelle: "Comptes", permission: "utilisateurs" },
  { href: "/admin/journal", libelle: "Journal des accès", permission: "journal" },
];

export default async function CadreBackOffice({ children }: { children: ReactNode }) {
  const admin = await exigerAdmin("tableau");
  const enRetard = await alertesRevueEnRetard(getPrisma(), new Date());

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-300 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <p className="text-lg font-bold">Sentya, back-office</p>
          <div className="flex items-center gap-4 text-sm">
            <span>
              {admin.email} ({LIBELLE_ROLE[admin.role]})
            </span>
            <form action={deconnecter}>
              <button
                type="submit"
                className="rounded border border-white px-3 py-1 font-semibold hover:bg-slate-700"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </header>
      {enRetard.length > 0 ? (
        <div role="alert" className="bg-red-700 px-4 py-3 text-white">
          <p className="mx-auto max-w-7xl font-semibold">
            Attention : {enRetard.length} opportunité(s) suspendue(s) attendent une revue depuis
            plus de 48 heures.{" "}
            <Link href="/admin/signalements" className="text-white underline hover:text-white">
              Traiter les signalements
            </Link>
          </p>
        </div>
      ) : null}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:flex-row">
        <nav aria-label="Back-office" className="md:w-56 md:shrink-0">
          <ul className="space-y-1">
            {LIENS.filter((l) => aLaPermission(admin.role, l.permission)).map((lien) => (
              <li key={lien.href}>
                <Link href={lien.href} className="block rounded px-2 py-1 hover:bg-slate-100">
                  {lien.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="contenu" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

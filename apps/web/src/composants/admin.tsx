// Éléments communs des pages du back-office (composants serveur).
import type { Statut } from "@sentya/db";
import { formaterDate } from "@sentya/core";
import Link from "next/link";
import type { ReactNode } from "react";
import { LIBELLE_PAYS, LIBELLE_STATUT, PAYS, STATUTS } from "@/lib/valeurs";

export function EnTete({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-2xl font-bold">{titre}</h1>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

const STYLE_STATUT: Record<Statut, string> = {
  BROUILLON: "bg-slate-200 text-slate-900",
  A_VERIFIER: "bg-amber-200 text-amber-950",
  VERIFIEE: "bg-emerald-100 text-emerald-900",
  SUSPENDUE: "bg-red-100 text-red-900",
};

export function BadgeStatut({ statut }: { statut: Statut }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${STYLE_STATUT[statut]}`}
    >
      {LIBELLE_STATUT[statut]}
    </span>
  );
}

/** Classe de ligne : les fiches à vérifier sont mises en évidence. */
export function classeLigne(statut: Statut): string {
  return statut === "A_VERIFIER" ? "bg-amber-50" : "";
}

export function DateVerification({ date }: { date: Date | null }) {
  return date ? <>{formaterDate(date)}</> : <span className="text-slate-700">Jamais</span>;
}

const MESSAGES: Record<string, string> = {
  cree: "La fiche a été créée.",
  enregistre: "Les modifications sont enregistrées.",
  supprime: "La fiche a été supprimée.",
};

/** Message de confirmation après une redirection (paramètre ?ok=...). */
export function MessageRetour({ code }: { code?: string | string[] }) {
  const message = typeof code === "string" ? MESSAGES[code] : undefined;
  if (!message) return null;
  return (
    <p
      role="status"
      className="mb-4 rounded border-l-4 border-emerald-700 bg-emerald-50 p-3 font-semibold text-emerald-900"
    >
      {message}
    </p>
  );
}

/** Filtres de liste par pays et statut (formulaire GET, sans JavaScript). */
export function FiltresListe({
  pays,
  statut,
  recherche,
  avecPays = true,
}: {
  pays?: string;
  statut?: string;
  recherche?: string;
  avecPays?: boolean;
}) {
  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-4 rounded bg-slate-50 p-4">
      {avecPays ? (
        <div>
          <label htmlFor="filtre-pays" className="block font-semibold">
            Pays
          </label>
          <select id="filtre-pays" name="pays" defaultValue={pays ?? ""} className="champ">
            <option value="">Tous</option>
            {PAYS.map((p) => (
              <option key={p} value={p}>
                {LIBELLE_PAYS[p]}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label htmlFor="filtre-statut" className="block font-semibold">
          Statut
        </label>
        <select id="filtre-statut" name="statut" defaultValue={statut ?? ""} className="champ">
          <option value="">Tous</option>
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {LIBELLE_STATUT[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filtre-recherche" className="block font-semibold">
          Recherche
        </label>
        <input
          id="filtre-recherche"
          name="q"
          type="search"
          defaultValue={recherche ?? ""}
          className="champ"
        />
      </div>
      <button type="submit" className="bouton-secondaire">
        Filtrer
      </button>
    </form>
  );
}

/** Lit un paramètre de recherche simple (premier si plusieurs). */
export function parametre(valeur: string | string[] | undefined): string | undefined {
  const v = Array.isArray(valeur) ? valeur[0] : valeur;
  return v ? v : undefined;
}

export function filtrePays(valeur: string | undefined) {
  return (PAYS as readonly string[]).includes(valeur ?? "")
    ? (valeur as (typeof PAYS)[number])
    : undefined;
}

export function filtreStatut(valeur: string | undefined) {
  return (STATUTS as readonly string[]).includes(valeur ?? "")
    ? (valeur as (typeof STATUTS)[number])
    : undefined;
}

export function LienRetour({ href, children }: { href: string; children: ReactNode }) {
  return (
    <p className="mb-4">
      <Link href={href}>{children}</Link>
    </p>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <p className="rounded bg-slate-50 p-4">{children}</p>;
}

export type ParametresRecherche = Promise<Record<string, string | string[] | undefined>>;

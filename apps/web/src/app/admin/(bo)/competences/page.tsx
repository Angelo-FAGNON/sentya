import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import {
  EnTete,
  MessageRetour,
  parametre,
  Vide,
  type ParametresRecherche,
} from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";

export const metadata: Metadata = { title: "Compétences" };

export default async function ListeCompetences({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const params = await searchParams;
  const q = parametre(params.q);
  const domaine = parametre(params.domaine);
  const prisma = getPrisma();
  const [competences, domaines] = await Promise.all([
    prisma.competence.findMany({
      where: {
        domaine,
        ...(q
          ? {
              OR: [
                { libelle: { contains: q, mode: "insensitive" as const } },
                { id: { contains: q.toLowerCase() } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { metiers: true } } },
      orderBy: [{ domaine: "asc" }, { libelle: "asc" }],
    }),
    prisma.competence.findMany({
      distinct: ["domaine"],
      select: { domaine: true },
      orderBy: { domaine: "asc" },
    }),
  ]);

  return (
    <>
      <EnTete titre="Compétences">
        <Link href="/admin/competences/nouveau" className="bouton">
          Nouvelle compétence
        </Link>
      </EnTete>
      <MessageRetour code={params.ok} />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-4 rounded bg-slate-50 p-4">
        <div>
          <label htmlFor="filtre-domaine" className="block font-semibold">
            Domaine
          </label>
          <select id="filtre-domaine" name="domaine" defaultValue={domaine ?? ""} className="champ">
            <option value="">Tous</option>
            {domaines.map((d) => (
              <option key={d.domaine} value={d.domaine}>
                {d.domaine}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtre-q" className="block font-semibold">
            Recherche
          </label>
          <input id="filtre-q" name="q" type="search" defaultValue={q ?? ""} className="champ" />
        </div>
        <button type="submit" className="bouton-secondaire">
          Filtrer
        </button>
      </form>
      {competences.length === 0 ? (
        <Vide>Aucune compétence ne correspond à ces filtres.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">Liste des compétences</caption>
            <thead>
              <tr>
                <th scope="col">Libellé</th>
                <th scope="col">Identifiant</th>
                <th scope="col">Domaine</th>
                <th scope="col">Synonymes</th>
                <th scope="col">Métiers liés</th>
              </tr>
            </thead>
            <tbody>
              {competences.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/competences/${c.id}`}>{c.libelle}</Link>
                  </td>
                  <td>
                    <code className="font-mono">{c.id}</code>
                  </td>
                  <td>{c.domaine}</td>
                  <td>{c.synonymes.join(", ")}</td>
                  <td>{c._count.metiers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

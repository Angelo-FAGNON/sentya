import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeStatut,
  classeLigne,
  DateVerification,
  EnTete,
  filtrePays,
  FiltresListe,
  filtreStatut,
  MessageRetour,
  parametre,
  Vide,
  type ParametresRecherche,
} from "@/composants/admin";
import { BoutonAction } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { LIBELLE_PAYS } from "@/lib/valeurs";
import { marquerVerifiee } from "../actions-fiches";

export const metadata: Metadata = { title: "Métiers" };

export default async function ListeMetiers({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const params = await searchParams;
  const pays = filtrePays(parametre(params.pays));
  const statut = filtreStatut(parametre(params.statut));
  const q = parametre(params.q);
  const metiers = await getPrisma().metier.findMany({
    where: {
      pays,
      statut,
      ...(q ? { libelle: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: { _count: { select: { competences: true, modeles: true } } },
    orderBy: [{ statut: "asc" }, { pays: "asc" }, { libelle: "asc" }],
  });

  return (
    <>
      <EnTete titre="Métiers">
        <Link href="/admin/metiers/nouveau" className="bouton">
          Nouveau métier
        </Link>
      </EnTete>
      <MessageRetour code={params.ok} />
      <FiltresListe pays={pays} statut={statut} recherche={q} />
      {metiers.length === 0 ? (
        <Vide>Aucun métier ne correspond à ces filtres.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">
              Liste des métiers. Les fiches à vérifier sont surlignées.
            </caption>
            <thead>
              <tr>
                <th scope="col">Libellé</th>
                <th scope="col">Pays</th>
                <th scope="col">Compétences</th>
                <th scope="col">Étapes types</th>
                <th scope="col">Statut</th>
                <th scope="col">Vérifiée le</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {metiers.map((m) => (
                <tr key={m.id} className={classeLigne(m.statut)}>
                  <td>
                    <Link href={`/admin/metiers/${m.id}`}>{m.libelle}</Link>
                    <br />
                    <code className="font-mono text-sm">{m.id}</code>
                  </td>
                  <td>{LIBELLE_PAYS[m.pays]}</td>
                  <td>{m._count.competences}</td>
                  <td>{m._count.modeles}</td>
                  <td>
                    <BadgeStatut statut={m.statut} />
                  </td>
                  <td>
                    <DateVerification date={m.verifieLe} />
                  </td>
                  <td>
                    <BoutonAction
                      action={marquerVerifiee.bind(null, "metier", m.id)}
                      libelle="Marquer comme vérifiée aujourd'hui"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

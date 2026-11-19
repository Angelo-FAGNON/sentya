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
import { LIBELLE_PAYS, LIBELLE_VOIE } from "@/lib/valeurs";
import { marquerVerifiee } from "../actions-fiches";

export const metadata: Metadata = { title: "Programmes" };

export default async function ListeProgrammes({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const params = await searchParams;
  const pays = filtrePays(parametre(params.pays));
  const statut = filtreStatut(parametre(params.statut));
  const q = parametre(params.q);
  const programmes = await getPrisma().programme.findMany({
    where: {
      pays,
      statut,
      ...(q ? { nom: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ statut: "asc" }, { nom: "asc" }],
  });

  return (
    <>
      <EnTete titre="Programmes">
        <Link href="/admin/programmes/nouveau" className="bouton">
          Nouveau programme
        </Link>
      </EnTete>
      <MessageRetour code={params.ok} />
      <FiltresListe pays={pays} statut={statut} recherche={q} />
      {programmes.length === 0 ? (
        <Vide>Aucun programme ne correspond à ces filtres.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">
              Liste des programmes. Les fiches à vérifier sont surlignées.
            </caption>
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Pays</th>
                <th scope="col">Voies</th>
                <th scope="col">Statut</th>
                <th scope="col">Vérifiée le</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {programmes.map((p) => (
                <tr key={p.id} className={classeLigne(p.statut)}>
                  <td>
                    <Link href={`/admin/programmes/${p.id}`}>{p.nom}</Link>
                  </td>
                  <td>{LIBELLE_PAYS[p.pays]}</td>
                  <td>{p.voies.map((v) => LIBELLE_VOIE[v]).join(", ")}</td>
                  <td>
                    <BadgeStatut statut={p.statut} />
                  </td>
                  <td>
                    <DateVerification date={p.verifieLe} />
                  </td>
                  <td>
                    <BoutonAction
                      action={marquerVerifiee.bind(null, "programme", p.id)}
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

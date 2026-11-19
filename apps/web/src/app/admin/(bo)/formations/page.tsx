import { formaterCout } from "@sentya/core";
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

export const metadata: Metadata = { title: "Formations" };

export default async function ListeFormations({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const params = await searchParams;
  const pays = filtrePays(parametre(params.pays));
  const statut = filtreStatut(parametre(params.statut));
  const q = parametre(params.q);
  const formations = await getPrisma().formation.findMany({
    where: {
      pays,
      statut,
      ...(q ? { intitule: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: [{ statut: "asc" }, { intitule: "asc" }],
  });

  return (
    <>
      <EnTete titre="Formations">
        <Link href="/admin/formations/nouveau" className="bouton">
          Nouvelle formation
        </Link>
      </EnTete>
      <MessageRetour code={params.ok} />
      <FiltresListe pays={pays} statut={statut} recherche={q} />
      {formations.length === 0 ? (
        <Vide>Aucune formation ne correspond à ces filtres.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">
              Liste des formations. Les fiches à vérifier sont surlignées.
            </caption>
            <thead>
              <tr>
                <th scope="col">Intitulé</th>
                <th scope="col">Organisme</th>
                <th scope="col">Pays</th>
                <th scope="col">Coût</th>
                <th scope="col">Statut</th>
                <th scope="col">Vérifiée le</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {formations.map((f) => (
                <tr key={f.id} className={classeLigne(f.statut)}>
                  <td>
                    <Link href={`/admin/formations/${f.id}`}>{f.intitule}</Link>
                  </td>
                  <td>{f.organisme}</td>
                  <td>{LIBELLE_PAYS[f.pays]}</td>
                  <td>{formaterCout(f.coutIndicatifFcfa)}</td>
                  <td>
                    <BadgeStatut statut={f.statut} />
                  </td>
                  <td>
                    <DateVerification date={f.verifieLe} />
                  </td>
                  <td>
                    <BoutonAction
                      action={marquerVerifiee.bind(null, "formation", f.id)}
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

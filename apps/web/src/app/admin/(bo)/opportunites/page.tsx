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

export const metadata: Metadata = { title: "Opportunités" };

export default async function ListeOpportunites({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const params = await searchParams;
  const pays = filtrePays(parametre(params.pays));
  const statut = filtreStatut(parametre(params.statut));
  const q = parametre(params.q);
  const opportunites = await getPrisma().opportunite.findMany({
    where: {
      pays,
      statut,
      ...(q ? { titre: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: { partenaire: { select: { nom: true } } },
    orderBy: [{ statut: "asc" }, { createdAt: "desc" }],
    take: 300,
  });

  return (
    <>
      <EnTete titre="Opportunités">
        <Link href="/admin/opportunites/nouveau" className="bouton">
          Nouvelle opportunité
        </Link>
      </EnTete>
      <MessageRetour code={params.ok} />
      <FiltresListe pays={pays} statut={statut} recherche={q} />
      {opportunites.length === 0 ? (
        <Vide>Aucune opportunité ne correspond à ces filtres.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">
              Liste des opportunités. Les fiches à vérifier sont surlignées.
            </caption>
            <thead>
              <tr>
                <th scope="col">Titre</th>
                <th scope="col">Pays</th>
                <th scope="col">Partenaire</th>
                <th scope="col">Alerte</th>
                <th scope="col">Signalements</th>
                <th scope="col">Statut</th>
                <th scope="col">Vérifiée le</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunites.map((o) => (
                <tr key={o.id} className={classeLigne(o.statut)}>
                  <td>
                    <Link href={`/admin/opportunites/${o.id}`}>{o.titre}</Link>
                  </td>
                  <td>{LIBELLE_PAYS[o.pays]}</td>
                  <td>{o.partenaire?.nom ?? "Aucun"}</td>
                  <td>{o.alerteFraude ? <strong className="text-red-800">Oui</strong> : "Non"}</td>
                  <td>{o.nbSignalements}</td>
                  <td>
                    <BadgeStatut statut={o.statut} />
                  </td>
                  <td>
                    <DateVerification date={o.verifieLe} />
                  </td>
                  <td>
                    {o.statut !== "VERIFIEE" ? (
                      <BoutonAction
                        action={marquerVerifiee.bind(null, "opportunite", o.id)}
                        libelle="Marquer comme vérifiée aujourd'hui"
                      />
                    ) : null}
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

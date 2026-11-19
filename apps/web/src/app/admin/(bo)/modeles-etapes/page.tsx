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

export const metadata: Metadata = { title: "Modèles d'étapes" };

export default async function ListeModeles({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const params = await searchParams;
  const pays = filtrePays(parametre(params.pays));
  const statut = filtreStatut(parametre(params.statut));
  const q = parametre(params.q);
  const metierId = parametre(params.metier);
  const modeles = await getPrisma().modeleEtape.findMany({
    where: {
      statut,
      metierId,
      ...(pays ? { metier: { pays } } : {}),
      ...(q ? { titre: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: { metier: { select: { libelle: true, pays: true } } },
    orderBy: [{ metierId: "asc" }, { voie: "asc" }, { ordre: "asc" }],
    take: 300,
  });

  return (
    <>
      <EnTete titre="Modèles d'étapes">
        <Link
          href={`/admin/modeles-etapes/nouveau${metierId ? `?metier=${encodeURIComponent(metierId)}` : ""}`}
          className="bouton"
        >
          Nouvelle étape type
        </Link>
      </EnTete>
      <MessageRetour code={params.ok} />
      {metierId ? (
        <p className="mb-4">
          Filtré sur le métier <code className="font-mono">{metierId}</code>.{" "}
          <Link href="/admin/modeles-etapes">Voir tous les métiers</Link>
        </p>
      ) : null}
      <FiltresListe pays={pays} statut={statut} recherche={q} />
      {modeles.length === 0 ? (
        <Vide>Aucune étape type ne correspond à ces filtres.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">
              Étapes types par métier et par voie. Les fiches à vérifier sont surlignées.
            </caption>
            <thead>
              <tr>
                <th scope="col">Métier</th>
                <th scope="col">Pays</th>
                <th scope="col">Voie</th>
                <th scope="col">Étape</th>
                <th scope="col">Statut</th>
                <th scope="col">Vérifiée le</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {modeles.map((m) => (
                <tr key={m.id} className={classeLigne(m.statut)}>
                  <td>{m.metier.libelle}</td>
                  <td>{LIBELLE_PAYS[m.metier.pays]}</td>
                  <td>{LIBELLE_VOIE[m.voie]}</td>
                  <td>
                    <Link href={`/admin/modeles-etapes/${m.id}`}>
                      {m.ordre}. {m.titre}
                    </Link>
                  </td>
                  <td>
                    <BadgeStatut statut={m.statut} />
                  </td>
                  <td>
                    <DateVerification date={m.verifieLe} />
                  </td>
                  <td>
                    <BoutonAction
                      action={marquerVerifiee.bind(null, "modeleEtape", m.id)}
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

import { formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeStatut, Vide, type ParametresRecherche } from "@/composants/admin";
import { exigerPartenaire } from "@/lib/garde";
import { LIBELLE_VALIDATION } from "@/lib/valeurs";

export const metadata: Metadata = { title: "Mes opportunités" };

export default async function EspacePartenaire({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  const { partenaire } = await exigerPartenaire();
  const { ok } = await searchParams;

  if (partenaire.statutValidation !== "VALIDE") {
    return (
      <>
        <h1 className="text-2xl font-bold">
          Demande {LIBELLE_VALIDATION[partenaire.statutValidation].toLowerCase()}
        </h1>
        {partenaire.statutValidation === "EN_ATTENTE" ? (
          <p className="mt-4">
            Merci. Un administrateur de Sentya vérifie ton organisation. Tu pourras publier des
            offres dès sa validation.
          </p>
        ) : (
          <p className="mt-4">
            Ta demande n&apos;a pas été validée. Contacte l&apos;équipe de Sentya pour en savoir
            plus.
          </p>
        )}
      </>
    );
  }

  const opportunites = await getPrisma().opportunite.findMany({
    where: { partenaireId: partenaire.id },
    include: { _count: { select: { candidatures: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Mes opportunités</h1>
        <Link href="/partenaire/opportunites/nouvelle" className="bouton">
          Publier une opportunité
        </Link>
      </div>
      {ok === "publiee" ? (
        <p
          role="status"
          className="mb-4 rounded border-l-4 border-emerald-700 bg-emerald-50 p-3 font-semibold text-emerald-900"
        >
          Offre reçue. Elle sera visible par les jeunes après vérification par un curateur.
        </p>
      ) : null}
      <p className="mb-6">
        Chaque offre est vérifiée par un curateur avant d&apos;être proposée aux jeunes.
      </p>
      {opportunites.length === 0 ? (
        <Vide>Aucune opportunité publiée pour l&apos;instant.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">Tes opportunités et leur statut</caption>
            <thead>
              <tr>
                <th scope="col">Titre</th>
                <th scope="col">Lieu</th>
                <th scope="col">Publiée le</th>
                <th scope="col">Statut</th>
                <th scope="col">Candidatures</th>
              </tr>
            </thead>
            <tbody>
              {opportunites.map((o) => (
                <tr key={o.id}>
                  <td>{o.titre}</td>
                  <td>{o.lieu}</td>
                  <td>{formaterDate(o.createdAt)}</td>
                  <td>
                    <BadgeStatut statut={o.statut} />
                  </td>
                  <td>{o._count.candidatures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

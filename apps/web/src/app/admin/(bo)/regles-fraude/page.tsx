import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTete, MessageRetour, Vide, type ParametresRecherche } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { LIBELLE_CATEGORIE_FRAUDE, LIBELLE_TYPE_MOTIF } from "@/lib/valeurs";

export const metadata: Metadata = { title: "Règles de fraude" };

export default async function ListeRegles({ searchParams }: { searchParams: ParametresRecherche }) {
  await exigerAdmin("referentiel");
  const { ok } = await searchParams;
  const regles = await getPrisma().regleFraude.findMany({
    orderBy: [{ actif: "desc" }, { bloquante: "desc" }, { categorie: "asc" }],
  });

  return (
    <>
      <EnTete titre="Règles de fraude">
        <Link href="/admin/regles-fraude/nouveau" className="bouton">
          Nouvelle règle
        </Link>
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-6">
        Ces règles s&apos;appliquent aux deux pays. Une règle bloquante fait refuser l&apos;offre.
      </p>
      {regles.length === 0 ? (
        <Vide>Aucune règle pour l&apos;instant.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">Règles de détection de fraude</caption>
            <thead>
              <tr>
                <th scope="col">Motif</th>
                <th scope="col">Type</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Bloquante</th>
                <th scope="col">Active</th>
              </tr>
            </thead>
            <tbody>
              {regles.map((r) => (
                <tr key={r.id} className={r.actif ? "" : "text-slate-700"}>
                  <td>
                    <Link href={`/admin/regles-fraude/${r.id}`}>
                      <code className="font-mono">{r.motif}</code>
                    </Link>
                    <br />
                    <span className="text-sm">{r.description}</span>
                  </td>
                  <td>{LIBELLE_TYPE_MOTIF[r.typeMotif]}</td>
                  <td>{LIBELLE_CATEGORIE_FRAUDE[r.categorie]}</td>
                  <td>{r.bloquante ? "Oui" : "Non"}</td>
                  <td>{r.actif ? "Oui" : "Non"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

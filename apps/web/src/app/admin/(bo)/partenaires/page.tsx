import { formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { EnTete, Vide } from "@/composants/admin";
import { BoutonAction } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { LIBELLE_PAYS, LIBELLE_TYPE_PARTENAIRE, LIBELLE_VALIDATION } from "@/lib/valeurs";
import { deciderPartenaire } from "./actions";

export const metadata: Metadata = { title: "Partenaires" };

export default async function Partenaires() {
  await exigerAdmin("partenaires");
  const prisma = getPrisma();
  const [enAttente, traites] = await Promise.all([
    prisma.partenaire.findMany({
      where: { statutValidation: "EN_ATTENTE" },
      include: { comptes: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.partenaire.findMany({
      where: { statutValidation: { not: "EN_ATTENTE" } },
      include: {
        validePar: { select: { email: true } },
        _count: { select: { opportunites: true } },
      },
      orderBy: { valideLe: "desc" },
      take: 200,
    }),
  ]);

  return (
    <>
      <EnTete titre="Partenaires" />
      <section aria-labelledby="titre-attente" className="mb-10">
        <h2 id="titre-attente" className="mb-3 text-xl font-semibold">
          Demandes en attente ({enAttente.length})
        </h2>
        {enAttente.length === 0 ? (
          <Vide>Aucune demande en attente.</Vide>
        ) : (
          <ul className="space-y-4">
            {enAttente.map((p) => (
              <li key={p.id} className="rounded border border-slate-300 p-4">
                <h3 className="text-lg font-semibold">{p.nom}</h3>
                <p>
                  {LIBELLE_TYPE_PARTENAIRE[p.type]}, {LIBELLE_PAYS[p.pays]}. Demande du{" "}
                  {formaterDate(p.createdAt)}.
                </p>
                <p>Contact officiel : {p.contactOfficiel}</p>
                <p>Compte : {p.comptes.map((c) => c.email).join(", ")}</p>
                <p className="mt-2 text-sm">
                  Vérifie l&apos;existence de l&apos;organisation avant de valider.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <BoutonAction
                    action={deciderPartenaire.bind(null, p.id, "VALIDE")}
                    libelle={`Valider ${p.nom}`}
                    variante="bouton"
                  />
                  <BoutonAction
                    action={deciderPartenaire.bind(null, p.id, "REFUSE")}
                    libelle={`Refuser ${p.nom}`}
                    variante="bouton-danger"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="titre-traites">
        <h2 id="titre-traites" className="mb-3 text-xl font-semibold">
          Partenaires traités
        </h2>
        {traites.length === 0 ? (
          <Vide>Aucun partenaire traité.</Vide>
        ) : (
          <div className="overflow-x-auto">
            <table className="tableau">
              <caption className="sr-only">Partenaires validés ou refusés</caption>
              <thead>
                <tr>
                  <th scope="col">Organisation</th>
                  <th scope="col">Type</th>
                  <th scope="col">Pays</th>
                  <th scope="col">Décision</th>
                  <th scope="col">Le</th>
                  <th scope="col">Par</th>
                  <th scope="col">Opportunités</th>
                </tr>
              </thead>
              <tbody>
                {traites.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nom}</td>
                    <td>{LIBELLE_TYPE_PARTENAIRE[p.type]}</td>
                    <td>{LIBELLE_PAYS[p.pays]}</td>
                    <td>{LIBELLE_VALIDATION[p.statutValidation]}</td>
                    <td>{p.valideLe ? formaterDate(p.valideLe) : ""}</td>
                    <td>{p.validePar?.email ?? ""}</td>
                    <td>{p._count.opportunites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

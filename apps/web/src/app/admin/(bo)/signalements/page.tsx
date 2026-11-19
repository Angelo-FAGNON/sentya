// File des signalements : par opportunité, les signalements non traités (RG-06).
import { fileSignalements, formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import { BadgeStatut, EnTete, Vide } from "@/composants/admin";
import { BoutonAction } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { LIBELLE_PAYS } from "@/lib/valeurs";
import { deciderSignalements } from "./actions";

export const metadata: Metadata = { title: "Signalements" };

export default async function Signalements() {
  await exigerAdmin("signalements");
  const file = await fileSignalements(getPrisma(), new Date());

  return (
    <>
      <EnTete titre="Signalements" />
      <p className="mb-6">
        Au 3e signalement, l&apos;offre est suspendue. Une revue humaine est attendue sous 48
        heures.
      </p>
      {file.length === 0 ? (
        <Vide>Aucun signalement à traiter.</Vide>
      ) : (
        <ul className="space-y-6">
          {file.map((o) => (
            <li
              key={o.id}
              className={`rounded border p-4 ${o.revueEnRetard ? "border-red-700 bg-red-50" : "border-slate-300"}`}
            >
              <h2 className="text-lg font-semibold">
                <Link href={`/admin/opportunites/${o.id}`}>{o.titre}</Link>
              </h2>
              <p>
                {LIBELLE_PAYS[o.pays]}, partenaire : {o.partenaire?.nom ?? "aucun"}. Statut :{" "}
                <BadgeStatut statut={o.statut} />
              </p>
              <p>
                Compteur de signalements : <strong>{o.nbSignalements}</strong>. Non traités :{" "}
                <strong>{o.signalements.length}</strong>.
                {o.suspendueLe ? ` Suspendue le ${formaterDate(o.suspendueLe)}.` : ""}
              </p>
              {o.revueEnRetard ? (
                <p className="mt-2 font-semibold text-red-900">
                  Revue en retard : suspendue depuis plus de 48 heures.
                </p>
              ) : null}
              <h3 className="mt-3 font-semibold">Motifs</h3>
              <ul className="list-disc pl-6">
                {o.signalements.map((s) => (
                  <li key={s.id}>
                    {formaterDate(s.createdAt)} : {s.motif}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <BoutonAction
                  action={deciderSignalements.bind(null, o.id, "FRAUDE_CONFIRMEE")}
                  libelle="Confirmer la fraude"
                  variante="bouton-danger"
                />
                <BoutonAction
                  action={deciderSignalements.bind(null, o.id, "REJETE")}
                  libelle="Rejeter le signalement"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

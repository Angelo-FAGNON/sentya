import { formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeStatut,
  DateVerification,
  EnTete,
  LienRetour,
  MessageRetour,
  type ParametresRecherche,
} from "@/composants/admin";
import { ZoneSuppression } from "@/composants/fiche";
import { BoutonAction } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { marquerVerifiee, supprimerFiche } from "../../actions-fiches";
import { modifierOpportunite } from "../actions";
import { FormulaireOpportunite } from "../formulaire-opportunite";

export const metadata: Metadata = { title: "Modifier une opportunité" };

export default async function ModifierOpportunite({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const opportunite = await getPrisma().opportunite.findUnique({
    where: { id },
    include: { partenaire: { select: { nom: true } }, _count: { select: { candidatures: true } } },
  });
  if (!opportunite) notFound();
  const { ok } = await searchParams;

  return (
    <>
      <LienRetour href="/admin/opportunites">Retour aux opportunités</LienRetour>
      <EnTete titre={opportunite.titre}>
        {opportunite.statut !== "VERIFIEE" ? (
          <BoutonAction
            action={marquerVerifiee.bind(null, "opportunite", opportunite.id)}
            libelle="Marquer comme vérifiée aujourd'hui"
            variante="bouton"
          />
        ) : null}
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-2">
        Statut : <BadgeStatut statut={opportunite.statut} />. Vérifiée le :{" "}
        <DateVerification date={opportunite.verifieLe} />. Partenaire :{" "}
        {opportunite.partenaire?.nom ?? "aucun"}. Candidatures : {opportunite._count.candidatures}.
        Signalements : {opportunite.nbSignalements}.
      </p>
      {opportunite.suspendueLe ? (
        <p className="mb-2">Suspendue le {formaterDate(opportunite.suspendueLe)}.</p>
      ) : null}
      {opportunite.alerteFraude ? (
        <div className="my-4 rounded border-l-4 border-red-700 bg-red-50 p-4 text-red-900">
          <p className="font-semibold">Alerte de fraude : vérifie cette offre avec attention.</p>
          <ul className="mt-2 list-disc pl-6">
            {opportunite.motifsAlerte.map((motif) => (
              <li key={motif}>{motif}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-6">Aucune alerte de fraude à la dernière analyse.</p>
      )}
      <FormulaireOpportunite
        key={opportunite.updatedAt.toISOString()}
        action={modifierOpportunite.bind(null, opportunite.id)}
        opportunite={opportunite}
      />
      <ZoneSuppression
        action={supprimerFiche.bind(null, "opportunite", opportunite.id)}
        avertissement="Les candidatures et signalements de cette offre seront supprimés. Pour la retirer sans perdre l'historique, passe-la plutôt au statut Suspendue."
      />
    </>
  );
}

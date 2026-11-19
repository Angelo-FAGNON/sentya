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
import { modifierFormation } from "../actions";
import { FormulaireFormation } from "../formulaire-formation";

export const metadata: Metadata = { title: "Modifier une formation" };

export default async function ModifierFormation({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const formation = await getPrisma().formation.findUnique({
    where: { id },
    include: { metiers: { include: { metier: { select: { id: true, libelle: true } } } } },
  });
  if (!formation) notFound();
  const { ok } = await searchParams;

  return (
    <>
      <LienRetour href="/admin/formations">Retour aux formations</LienRetour>
      <EnTete titre={formation.intitule}>
        <BoutonAction
          action={marquerVerifiee.bind(null, "formation", formation.id)}
          libelle="Marquer comme vérifiée aujourd'hui"
          variante="bouton"
        />
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-2">
        Statut : <BadgeStatut statut={formation.statut} />. Vérifiée le :{" "}
        <DateVerification date={formation.verifieLe} />.
      </p>
      <p className="mb-6">
        Métiers liés :{" "}
        {formation.metiers.length === 0
          ? "aucun (le lien se fait depuis la fiche du métier)"
          : formation.metiers.map((m) => m.metier.libelle).join(", ")}
        .
      </p>
      <FormulaireFormation
        key={formation.updatedAt.toISOString()}
        action={modifierFormation.bind(null, formation.id)}
        formation={formation}
      />
      <ZoneSuppression
        action={supprimerFiche.bind(null, "formation", formation.id)}
        avertissement="Les liens avec les métiers seront retirés. Les plans déjà créés gardent leur copie. Cette action est définitive."
      />
    </>
  );
}

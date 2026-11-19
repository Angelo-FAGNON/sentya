import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnTete, LienRetour } from "@/composants/admin";
import { ZoneSuppression } from "@/composants/fiche";
import { exigerAdmin } from "@/lib/garde";
import { supprimerFiche } from "../../actions-fiches";
import { modifierRegle } from "../actions";
import { FormulaireRegle } from "../formulaire-regle";

export const metadata: Metadata = { title: "Modifier une règle de fraude" };

export default async function ModifierRegle({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const regle = await getPrisma().regleFraude.findUnique({ where: { id } });
  if (!regle) notFound();
  return (
    <>
      <LienRetour href="/admin/regles-fraude">Retour aux règles</LienRetour>
      <EnTete titre="Modifier une règle de fraude" />
      <FormulaireRegle
        key={regle.updatedAt.toISOString()}
        action={modifierRegle.bind(null, regle.id)}
        regle={regle}
      />
      <ZoneSuppression
        action={supprimerFiche.bind(null, "regleFraude", regle.id)}
        avertissement="Pour suspendre la règle sans la perdre, décoche plutôt « Règle active ». La suppression est définitive."
      />
    </>
  );
}

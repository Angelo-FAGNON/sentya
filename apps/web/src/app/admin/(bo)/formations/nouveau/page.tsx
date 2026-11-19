import type { Metadata } from "next";
import { EnTete, LienRetour } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerFormation } from "../actions";
import { FormulaireFormation } from "../formulaire-formation";

export const metadata: Metadata = { title: "Nouvelle formation" };

export default async function NouvelleFormation() {
  await exigerAdmin("referentiel");
  return (
    <>
      <LienRetour href="/admin/formations">Retour aux formations</LienRetour>
      <EnTete titre="Nouvelle formation" />
      <FormulaireFormation action={creerFormation} />
    </>
  );
}

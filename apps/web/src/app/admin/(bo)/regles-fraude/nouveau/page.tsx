import type { Metadata } from "next";
import { EnTete, LienRetour } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerRegle } from "../actions";
import { FormulaireRegle } from "../formulaire-regle";

export const metadata: Metadata = { title: "Nouvelle règle de fraude" };

export default async function NouvelleRegle() {
  await exigerAdmin("referentiel");
  return (
    <>
      <LienRetour href="/admin/regles-fraude">Retour aux règles</LienRetour>
      <EnTete titre="Nouvelle règle de fraude" />
      <FormulaireRegle action={creerRegle} />
    </>
  );
}

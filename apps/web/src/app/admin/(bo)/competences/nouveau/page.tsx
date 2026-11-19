import type { Metadata } from "next";
import { EnTete, LienRetour } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerCompetence } from "../actions";
import { FormulaireCompetence } from "../formulaire-competence";

export const metadata: Metadata = { title: "Nouvelle compétence" };

export default async function NouvelleCompetence() {
  await exigerAdmin("referentiel");
  return (
    <>
      <LienRetour href="/admin/competences">Retour aux compétences</LienRetour>
      <EnTete titre="Nouvelle compétence" />
      <FormulaireCompetence action={creerCompetence} />
    </>
  );
}

import type { Metadata } from "next";
import { EnTete, LienRetour } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerOpportunite } from "../actions";
import { FormulaireOpportunite } from "../formulaire-opportunite";

export const metadata: Metadata = { title: "Nouvelle opportunité" };

export default async function NouvelleOpportunite() {
  await exigerAdmin("referentiel");
  return (
    <>
      <LienRetour href="/admin/opportunites">Retour aux opportunités</LienRetour>
      <EnTete titre="Nouvelle opportunité" />
      <p className="mb-6">
        L&apos;offre est analysée par les règles de fraude. Une offre qui demande des frais au
        candidat est refusée.
      </p>
      <FormulaireOpportunite action={creerOpportunite} />
    </>
  );
}

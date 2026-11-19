import type { Metadata } from "next";
import { EnTete, LienRetour } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerMetier } from "../actions";
import { FormulaireMetier } from "../formulaires-metier";

export const metadata: Metadata = { title: "Nouveau métier" };

export default async function NouveauMetier() {
  await exigerAdmin("referentiel");
  return (
    <>
      <LienRetour href="/admin/metiers">Retour aux métiers</LienRetour>
      <EnTete titre="Nouveau métier" />
      <p className="mb-6">
        Après la création, tu pourras lier les compétences et les formations du métier.
      </p>
      <FormulaireMetier action={creerMetier} />
    </>
  );
}

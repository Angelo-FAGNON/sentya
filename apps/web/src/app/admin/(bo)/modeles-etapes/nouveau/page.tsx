import type { Metadata } from "next";
import { EnTete, LienRetour, parametre, type ParametresRecherche } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerModeleEtape } from "../actions";
import { FormulaireModele } from "../formulaire-modele";

export const metadata: Metadata = { title: "Nouvelle étape type" };

export default async function NouveauModele({
  searchParams,
}: {
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const metier = parametre((await searchParams).metier);
  return (
    <>
      <LienRetour href="/admin/modeles-etapes">Retour aux modèles d&apos;étapes</LienRetour>
      <EnTete titre="Nouvelle étape type" />
      <FormulaireModele action={creerModeleEtape} metierParDefaut={metier} />
    </>
  );
}

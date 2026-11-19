import type { Metadata } from "next";
import { EnTete, LienRetour } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";
import { creerProgramme } from "../actions";
import { FormulaireProgramme } from "../formulaire-programme";

export const metadata: Metadata = { title: "Nouveau programme" };

export default async function NouveauProgramme() {
  await exigerAdmin("referentiel");
  return (
    <>
      <LienRetour href="/admin/programmes">Retour aux programmes</LienRetour>
      <EnTete titre="Nouveau programme" />
      <FormulaireProgramme action={creerProgramme} />
    </>
  );
}

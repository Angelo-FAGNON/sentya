"use server";
// Création et modification des formations.
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { statutEtVerification } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaFormation } from "@/lib/schemas";

function lire(formData: FormData) {
  const saisie = schemaFormation.safeParse(lireFormulaire(formData));
  if (!saisie.success) return saisie;
  const { verifieeAujourdhui, statut, verifieLe, ...champs } = saisie.data;
  return {
    success: true as const,
    data: {
      ...champs,
      ...statutEtVerification({ statut, verifieLe, verifieeAujourdhui }, new Date()),
    },
  };
}

export async function creerFormation(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = lire(formData);
  if (!saisie.success) return echecValidation(saisie.error);
  const formation = await getPrisma().formation.create({ data: saisie.data });
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "formation.creer",
    `Formation:${formation.id}`,
  );
  revalidatePath("/admin", "layout");
  redirect(`/admin/formations/${formation.id}?ok=cree`);
}

export async function modifierFormation(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = lire(formData);
  if (!saisie.success) return echecValidation(saisie.error);
  await getPrisma().formation.update({ where: { id }, data: saisie.data });
  await journaliser({ type: "ADMIN", id: admin.id }, "formation.modifier", `Formation:${id}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/formations?ok=enregistre");
}

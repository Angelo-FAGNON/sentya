"use server";
// Règles de détection de fraude (EF-10). Une expression régulière doit compiler avant d'être enregistrée.
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaRegleFraude } from "@/lib/schemas";

export async function creerRegle(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaRegleFraude.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const regle = await getPrisma().regleFraude.create({ data: saisie.data });
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "regle_fraude.creer",
    `RegleFraude:${regle.id}`,
  );
  revalidatePath("/admin", "layout");
  redirect("/admin/regles-fraude?ok=cree");
}

export async function modifierRegle(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaRegleFraude.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  await getPrisma().regleFraude.update({ where: { id }, data: saisie.data });
  await journaliser({ type: "ADMIN", id: admin.id }, "regle_fraude.modifier", `RegleFraude:${id}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/regles-fraude?ok=enregistre");
}

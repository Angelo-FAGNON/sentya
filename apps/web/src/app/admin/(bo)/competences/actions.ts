"use server";
// Compétences du référentiel commun (sans pays ni statut, hypothèse H5).
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echec, echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { estErreurUnicite } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaCompetence } from "@/lib/schemas";

export async function creerCompetence(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaCompetence.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  try {
    await getPrisma().competence.create({ data: saisie.data });
  } catch (erreur) {
    if (estErreurUnicite(erreur)) {
      return echec("Cet identifiant existe déjà.", { id: "Choisis un autre identifiant." });
    }
    throw erreur;
  }
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "competence.creer",
    `Competence:${saisie.data.id}`,
  );
  revalidatePath("/admin", "layout");
  redirect("/admin/competences?ok=cree");
}

export async function modifierCompetence(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  // L'identifiant n'est pas modifiable : l'IA et les liens s'en servent.
  const saisie = schemaCompetence.omit({ id: true }).safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  await getPrisma().competence.update({ where: { id }, data: saisie.data });
  await journaliser({ type: "ADMIN", id: admin.id }, "competence.modifier", `Competence:${id}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/competences?ok=enregistre");
}

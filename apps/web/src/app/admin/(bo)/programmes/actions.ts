"use server";
// Création et modification des programmes publics (ex. Azôli, programme AIDE).
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { statutEtVerification } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaProgramme } from "@/lib/schemas";

function lire(formData: FormData) {
  return schemaProgramme.safeParse(lireFormulaire(formData, ["voies"]));
}

export async function creerProgramme(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = lire(formData);
  if (!saisie.success) return echecValidation(saisie.error);
  const { verifieeAujourdhui, statut, verifieLe, ...champs } = saisie.data;
  const programme = await getPrisma().programme.create({
    data: {
      ...champs,
      ...statutEtVerification({ statut, verifieLe, verifieeAujourdhui }, new Date()),
    },
  });
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "programme.creer",
    `Programme:${programme.id}`,
  );
  revalidatePath("/admin", "layout");
  redirect(`/admin/programmes/${programme.id}?ok=cree`);
}

export async function modifierProgramme(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = lire(formData);
  if (!saisie.success) return echecValidation(saisie.error);
  const { verifieeAujourdhui, statut, verifieLe, ...champs } = saisie.data;
  await getPrisma().programme.update({
    where: { id },
    data: {
      ...champs,
      ...statutEtVerification({ statut, verifieLe, verifieeAujourdhui }, new Date()),
    },
  });
  await journaliser({ type: "ADMIN", id: admin.id }, "programme.modifier", `Programme:${id}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/programmes?ok=enregistre`);
}

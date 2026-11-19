"use server";
// Revue qualité hebdomadaire (EF-12) : échantillon et notation.
import { echantillonnerRevue, noterRevue } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echecValidation, succes, type EtatFormulaire } from "@/lib/etat-formulaire";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaNoteRevue } from "@/lib/schemas";

export async function genererEchantillon(
  _etat: EtatFormulaire,
  _formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("revue");
  const crees = await echantillonnerRevue(getPrisma(), new Date());
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "revue.echantillonner",
    `RevueQualite:${crees}`,
  );
  revalidatePath("/admin", "layout");
  return succes(
    crees > 0
      ? `${crees} conversation(s) ajoutée(s) à l'échantillon de la semaine.`
      : "Aucune nouvelle conversation : l'échantillon existe déjà ou la semaine est vide.",
  );
}

export async function noter(
  revueId: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("revue");
  const saisie = schemaNoteRevue.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  await noterRevue(
    getPrisma(),
    {
      revueId,
      relecteurId: admin.id,
      pistesCorrectes: saisie.data.pistesCorrectes,
      inventionDetectee: saisie.data.inventionDetectee,
      commentaire: saisie.data.commentaire ?? undefined,
    },
    new Date(),
  );
  await journaliser({ type: "ADMIN", id: admin.id }, "revue.noter", `RevueQualite:${revueId}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/revue?ok=enregistre");
}

"use server";
// Validation manuelle des organisations partenaires (ADMIN uniquement).
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { echec, succes, type EtatFormulaire } from "@/lib/etat-formulaire";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";

export async function deciderPartenaire(
  partenaireId: string,
  decision: "VALIDE" | "REFUSE",
  _etat: EtatFormulaire,
  _formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("partenaires");
  const resultat = await getPrisma().partenaire.updateMany({
    where: { id: partenaireId, statutValidation: "EN_ATTENTE" },
    data: { statutValidation: decision, valideLe: new Date(), valideParId: admin.id },
  });
  if (resultat.count === 0) return echec("Cette demande a déjà été traitée.");
  await journaliser(
    { type: "ADMIN", id: admin.id },
    decision === "VALIDE" ? "partenaire.valider" : "partenaire.refuser",
    `Partenaire:${partenaireId}`,
  );
  revalidatePath("/admin", "layout");
  return succes(decision === "VALIDE" ? "Partenaire validé." : "Partenaire refusé.");
}

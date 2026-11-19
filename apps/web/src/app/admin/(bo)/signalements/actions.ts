"use server";
// Décision du curateur sur les signalements d'une opportunité (RG-06).
import { traiterSignalements } from "@sentya/core";
import { revalidatePath } from "next/cache";
import { contexteWeb } from "@/lib/contexte";
import { succes, type EtatFormulaire } from "@/lib/etat-formulaire";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";

export async function deciderSignalements(
  opportuniteId: string,
  decision: "FRAUDE_CONFIRMEE" | "REJETE",
  _etat: EtatFormulaire,
  _formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("signalements");
  await traiterSignalements(contexteWeb(), { opportuniteId, decision, adminId: admin.id });
  await journaliser(
    { type: "ADMIN", id: admin.id },
    decision === "FRAUDE_CONFIRMEE" ? "signalement.confirmer_fraude" : "signalement.rejeter",
    `Opportunite:${opportuniteId}`,
  );
  revalidatePath("/admin", "layout");
  return succes(
    decision === "FRAUDE_CONFIRMEE"
      ? "Fraude confirmée : l'opportunité reste suspendue."
      : "Signalement rejeté.",
  );
}

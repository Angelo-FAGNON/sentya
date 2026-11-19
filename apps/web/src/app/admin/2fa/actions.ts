"use server";
// Enrôlement de la double authentification (TOTP). Après confirmation, la session ouverte sans
// code est fermée : l'administrateur se reconnecte avec son code.
import { getPrisma } from "@sentya/db";
import { signOut } from "@/auth";
import { env } from "@/env";
import { dechiffrer } from "@/lib/chiffrement";
import { echec, echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { exigerAdminPourEnrolement } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaCodeTotp } from "@/lib/schemas";
import { verifierCodeTotp } from "@/lib/totp";

export async function confirmerTotp(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const { compte } = await exigerAdminPourEnrolement();
  if (compte.totpActive) return echec("La double authentification est déjà active.");
  if (!compte.totpSecret) return echec("Recharge la page pour obtenir ton code QR.");

  const saisie = schemaCodeTotp.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);

  const secret = dechiffrer(compte.totpSecret, env().AUTH_SECRET);
  if (!(await verifierCodeTotp(secret, saisie.data.code))) {
    await journaliser({ type: "ADMIN", id: compte.id }, "totp_enrolement_echec");
    return echec("Ce code ne correspond pas. Vérifie l'heure de ton téléphone et réessaie.", {
      code: "Code incorrect.",
    });
  }

  await getPrisma().adminUser.updateMany({
    where: { id: compte.id, totpActive: false },
    data: { totpActive: true },
  });
  await journaliser({ type: "ADMIN", id: compte.id }, "totp_active", `AdminUser:${compte.id}`);
  await signOut({ redirectTo: "/admin/connexion?info=2fa" });
  return echec("Redirection impossible.");
}

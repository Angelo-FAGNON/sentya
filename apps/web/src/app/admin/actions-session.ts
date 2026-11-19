"use server";
// Connexion et déconnexion du back-office.
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { echec, echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { sessionCourante } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaConnexionAdmin } from "@/lib/schemas";

export async function connecterAdmin(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const saisie = schemaConnexionAdmin.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  try {
    await signIn("admin", {
      email: saisie.data.email,
      motDePasse: saisie.data.motDePasse,
      code: saisie.data.code ?? "",
      redirectTo: "/admin",
    });
  } catch (erreur) {
    // En cas de succès, signIn lève une redirection : on la laisse passer.
    if (erreur instanceof AuthError) {
      return echec(
        "Connexion refusée. Vérifie ton e-mail, ton mot de passe et ton code. Après 5 essais, attends 15 minutes.",
      );
    }
    throw erreur;
  }
  return echec("Connexion impossible.");
}

export async function deconnecter() {
  const session = await sessionCourante();
  if (session) {
    await journaliser(
      { type: session.role === "PARTENAIRE" ? "PARTENAIRE" : "ADMIN", id: session.id },
      "deconnexion",
    );
  }
  await signOut({
    redirectTo: session?.role === "PARTENAIRE" ? "/partenaire/connexion" : "/admin/connexion",
  });
}

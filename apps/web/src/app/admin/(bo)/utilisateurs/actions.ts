"use server";
// Comptes du back-office (ADMIN uniquement) : création et désactivation.
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { echec, echecValidation, succes, type EtatFormulaire } from "@/lib/etat-formulaire";
import { estErreurUnicite } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { hacherMotDePasse } from "@/lib/mots-de-passe";
import { lireFormulaire, schemaNouvelAdmin } from "@/lib/schemas";

export async function creerCompte(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("utilisateurs");
  const saisie = schemaNouvelAdmin.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  try {
    const compte = await getPrisma().adminUser.create({
      data: {
        email: saisie.data.email,
        role: saisie.data.role,
        motDePasseHache: await hacherMotDePasse(saisie.data.motDePasse),
      },
    });
    await journaliser({ type: "ADMIN", id: admin.id }, "compte.creer", `AdminUser:${compte.id}`);
  } catch (erreur) {
    if (estErreurUnicite(erreur)) {
      return echec("Un compte existe déjà avec cet e-mail.", { email: "E-mail déjà utilisé." });
    }
    throw erreur;
  }
  revalidatePath("/admin", "layout");
  return succes(
    "Compte créé. À sa première connexion, la personne devra activer la double authentification.",
  );
}

export async function changerActivation(
  compteId: string,
  actif: boolean,
  _etat: EtatFormulaire,
  _formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("utilisateurs");
  if (compteId === admin.id) return echec("Tu ne peux pas désactiver ton propre compte.");
  await getPrisma().adminUser.update({ where: { id: compteId }, data: { actif } });
  await journaliser(
    { type: "ADMIN", id: admin.id },
    actif ? "compte.reactiver" : "compte.desactiver",
    `AdminUser:${compteId}`,
  );
  revalidatePath("/admin", "layout");
  return succes(actif ? "Compte réactivé." : "Compte désactivé.");
}

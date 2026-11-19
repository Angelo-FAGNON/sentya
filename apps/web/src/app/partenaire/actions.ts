"use server";
// Espace partenaire : inscription, connexion, publication d'opportunités.
import { OffreRefuseeError, soumettreOpportunite } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { echec, echecValidation, succes, type EtatFormulaire } from "@/lib/etat-formulaire";
import { estErreurUnicite, messageRefus } from "@/lib/fiche";
import { exigerPartenaire } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { hacherMotDePasse } from "@/lib/mots-de-passe";
import {
  lireFormulaire,
  schemaConnexionPartenaire,
  schemaInscriptionPartenaire,
  schemaOpportunitePartenaire,
} from "@/lib/schemas";

export async function inscrirePartenaire(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const saisie = schemaInscriptionPartenaire.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const { type, nom, pays, contactOfficiel, email, motDePasse } = saisie.data;
  const prisma = getPrisma();
  try {
    const compte = await prisma.$transaction(async (tx) => {
      const partenaire = await tx.partenaire.create({
        data: { type, nom, pays, contactOfficiel, statutValidation: "EN_ATTENTE" },
      });
      return tx.partenaireCompte.create({
        data: {
          partenaireId: partenaire.id,
          email,
          motDePasseHache: await hacherMotDePasse(motDePasse),
        },
      });
    });
    await journaliser(
      { type: "PARTENAIRE", id: compte.id },
      "inscription",
      `Partenaire:${compte.partenaireId}`,
    );
  } catch (erreur) {
    if (estErreurUnicite(erreur)) {
      return echec("Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.", {
        email: "E-mail déjà utilisé.",
      });
    }
    throw erreur;
  }
  return succes(
    "Demande enregistrée. Un administrateur de Sentya va vérifier ton organisation. Tu pourras publier des offres après sa validation.",
  );
}

export async function connecterPartenaire(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const saisie = schemaConnexionPartenaire.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  try {
    await signIn("partenaire", { ...saisie.data, redirectTo: "/partenaire" });
  } catch (erreur) {
    if (erreur instanceof AuthError) {
      return echec(
        "Connexion refusée. Vérifie ton e-mail et ton mot de passe. Après 5 essais, attends 15 minutes.",
      );
    }
    throw erreur;
  }
  return echec("Connexion impossible.");
}

/**
 * Publication par un partenaire validé. Le pays vient de son organisation, jamais du formulaire.
 * L'offre arrive en brouillon (RG-05) ; une offre qui demande des frais est refusée.
 */
export async function publierOpportunite(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const { compteId, partenaire } = await exigerPartenaire({ valide: true });
  const saisie = schemaOpportunitePartenaire.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const prisma = getPrisma();
  if (saisie.data.metierId) {
    const metier = await prisma.metier.findUnique({ where: { id: saisie.data.metierId } });
    if (!metier || metier.pays !== partenaire.pays) {
      return echec("Choisis un métier de ton pays.", { metierId: "Métier d'un autre pays." });
    }
  }
  let id: string;
  try {
    id = (
      await soumettreOpportunite(prisma, {
        ...saisie.data,
        pays: partenaire.pays,
        partenaireId: partenaire.id,
      })
    ).id;
  } catch (erreur) {
    if (erreur instanceof OffreRefuseeError) {
      await journaliser(
        { type: "PARTENAIRE", id: compteId },
        "opportunite.refusee",
        `Partenaire:${partenaire.id}`,
      );
      return echec(messageRefus(erreur.analyse));
    }
    throw erreur;
  }
  await journaliser(
    { type: "PARTENAIRE", id: compteId },
    "opportunite.soumettre",
    `Opportunite:${id}`,
  );
  revalidatePath("/partenaire", "layout");
  redirect("/partenaire?ok=publiee");
}

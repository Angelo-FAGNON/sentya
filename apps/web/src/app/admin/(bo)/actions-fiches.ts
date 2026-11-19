"use server";
// Actions communes aux fiches : « Marquer comme vérifiée aujourd'hui » et suppression.
// Chaque action revérifie le rôle et écrit une ligne dans le journal des accès.
import { OffreRefuseeError, verifierOpportunite } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contexteWeb } from "@/lib/contexte";
import { echec, succes, type EtatFormulaire } from "@/lib/etat-formulaire";
import { estErreurReference, messageRefus } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";

export type EntiteFiche =
  | "metier"
  | "formation"
  | "programme"
  | "modeleEtape"
  | "opportunite"
  | "competence"
  | "regleFraude";

const CHEMINS: Record<EntiteFiche, string> = {
  metier: "/admin/metiers",
  formation: "/admin/formations",
  programme: "/admin/programmes",
  modeleEtape: "/admin/modeles-etapes",
  opportunite: "/admin/opportunites",
  competence: "/admin/competences",
  regleFraude: "/admin/regles-fraude",
};

const NOMS_RESSOURCE: Record<EntiteFiche, string> = {
  metier: "Metier",
  formation: "Formation",
  programme: "Programme",
  modeleEtape: "ModeleEtape",
  opportunite: "Opportunite",
  competence: "Competence",
  regleFraude: "RegleFraude",
};

export async function marquerVerifiee(
  entite: EntiteFiche,
  id: string,
  _etat: EtatFormulaire,
  _formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const prisma = getPrisma();
  const maintenant = new Date();
  const donnees = { statut: "VERIFIEE" as const, verifieLe: maintenant };
  try {
    switch (entite) {
      case "metier":
        await prisma.metier.update({ where: { id }, data: donnees });
        break;
      case "formation":
        await prisma.formation.update({ where: { id }, data: donnees });
        break;
      case "programme":
        await prisma.programme.update({ where: { id }, data: donnees });
        break;
      case "modeleEtape":
        await prisma.modeleEtape.update({ where: { id }, data: donnees });
        break;
      case "opportunite":
        // RG-05 : le noyau refait l'analyse de fraude et refuse une offre qui demande des frais.
        await verifierOpportunite(contexteWeb(), id);
        break;
      default:
        return echec("Cette fiche n'a pas de statut de vérification.");
    }
  } catch (erreur) {
    if (erreur instanceof OffreRefuseeError) return echec(messageRefus(erreur.analyse));
    throw erreur;
  }
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "fiche.verifier",
    `${NOMS_RESSOURCE[entite]}:${id}`,
  );
  revalidatePath("/admin", "layout");
  return succes("Fiche marquée comme vérifiée aujourd'hui.");
}

export async function supprimerFiche(
  entite: EntiteFiche,
  id: string,
  _etat: EtatFormulaire,
  _formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const prisma = getPrisma();
  try {
    switch (entite) {
      case "metier":
        await prisma.metier.delete({ where: { id } });
        break;
      case "formation":
        await prisma.formation.delete({ where: { id } });
        break;
      case "programme":
        await prisma.programme.delete({ where: { id } });
        break;
      case "modeleEtape":
        await prisma.modeleEtape.delete({ where: { id } });
        break;
      case "opportunite":
        await prisma.opportunite.delete({ where: { id } });
        break;
      case "competence":
        await prisma.competence.delete({ where: { id } });
        break;
      case "regleFraude":
        await prisma.regleFraude.delete({ where: { id } });
        break;
    }
  } catch (erreur) {
    if (estErreurReference(erreur)) {
      return echec(
        "Suppression impossible : cette fiche a déjà servi à des jeunes. Passe-la plutôt au statut Suspendue.",
      );
    }
    throw erreur;
  }
  await journaliser(
    { type: "ADMIN", id: admin.id },
    "fiche.supprimer",
    `${NOMS_RESSOURCE[entite]}:${id}`,
  );
  revalidatePath("/admin", "layout");
  redirect(`${CHEMINS[entite]}?ok=supprime`);
}

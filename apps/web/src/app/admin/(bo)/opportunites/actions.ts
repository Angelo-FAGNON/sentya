"use server";
// Opportunités saisies par un curateur. La création passe par soumettreOpportunite (RG-05 :
// toujours en brouillon, refus si des frais sont demandés). Le passage à VERIFIEE passe
// toujours par verifierOpportunite, qui refait l'analyse de fraude.
import {
  analyserOffre,
  OffreRefuseeError,
  soumettreOpportunite,
  verifierOpportunite,
} from "@sentya/core";
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contexteWeb } from "@/lib/contexte";
import { echec, echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { messageRefus } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaOpportuniteCurateur } from "@/lib/schemas";

/** Le métier et le partenaire choisis doivent exister et être du pays de l'offre. */
async function verifierLiens(saisie: {
  pays: "BJ" | "TG";
  metierId: string | null;
  partenaireId: string | null;
}): Promise<EtatFormulaire | null> {
  const prisma = getPrisma();
  if (saisie.metierId) {
    const metier = await prisma.metier.findUnique({ where: { id: saisie.metierId } });
    if (!metier || metier.pays !== saisie.pays) {
      return echec("Le métier doit être du même pays que l'offre.", { metierId: "Autre pays." });
    }
  }
  if (saisie.partenaireId) {
    const partenaire = await prisma.partenaire.findUnique({ where: { id: saisie.partenaireId } });
    if (!partenaire || partenaire.pays !== saisie.pays) {
      return echec("Le partenaire doit être du même pays que l'offre.", {
        partenaireId: "Autre pays.",
      });
    }
  }
  return null;
}

export async function creerOpportunite(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaOpportuniteCurateur.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const { statut, verifieeAujourdhui, ...contenu } = saisie.data;
  const erreurLiens = await verifierLiens(contenu);
  if (erreurLiens) return erreurLiens;

  let id: string;
  try {
    id = (await soumettreOpportunite(getPrisma(), contenu)).id;
    if (statut === "VERIFIEE" || verifieeAujourdhui) {
      await verifierOpportunite(contexteWeb(), id);
    } else if (statut !== "BROUILLON") {
      await getPrisma().opportunite.update({ where: { id }, data: { statut } });
    }
  } catch (erreur) {
    if (erreur instanceof OffreRefuseeError) {
      await journaliser({ type: "ADMIN", id: admin.id }, "opportunite.refusee", null);
      return echec(messageRefus(erreur.analyse));
    }
    throw erreur;
  }
  await journaliser({ type: "ADMIN", id: admin.id }, "opportunite.creer", `Opportunite:${id}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/opportunites/${id}?ok=cree`);
}

export async function modifierOpportunite(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaOpportuniteCurateur.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const { statut, verifieeAujourdhui, ...contenu } = saisie.data;
  const erreurLiens = await verifierLiens(contenu);
  if (erreurLiens) return erreurLiens;

  const prisma = getPrisma();
  const actuelle = await prisma.opportunite.findUnique({ where: { id } });
  if (!actuelle) return echec("Opportunité introuvable.");

  // Le texte modifié est analysé à nouveau : une offre qui demande des frais est refusée.
  const analyse = await analyserOffre(prisma, contenu);
  if (analyse.bloquante) return echec(messageRefus(analyse));
  const maintenant = new Date();
  await prisma.opportunite.update({
    where: { id },
    data: {
      ...contenu,
      alerteFraude: analyse.alerte,
      motifsAlerte: analyse.motifs.map((m) => m.description),
      ...(statut === "SUSPENDUE" && actuelle.statut !== "SUSPENDUE"
        ? { statut, suspendueLe: maintenant, revueLe: maintenant }
        : {}),
      ...(statut === "BROUILLON" || statut === "A_VERIFIER" ? { statut, suspendueLe: null } : {}),
    },
  });
  const doitVerifier =
    verifieeAujourdhui || (statut === "VERIFIEE" && actuelle.statut !== "VERIFIEE");
  if (doitVerifier) {
    try {
      await verifierOpportunite(contexteWeb(), id);
    } catch (erreur) {
      if (erreur instanceof OffreRefuseeError) return echec(messageRefus(erreur.analyse));
      throw erreur;
    }
  }
  await journaliser({ type: "ADMIN", id: admin.id }, "opportunite.modifier", `Opportunite:${id}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/opportunites/${id}?ok=enregistre`);
}

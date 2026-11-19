"use server";
// Modèles d'étapes : 3 étapes types (ordre 1 à 3) par métier et par voie.
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echec, echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { estErreurUnicite, statutEtVerification } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaModeleEtape } from "@/lib/schemas";

/** Valide la saisie et vérifie que métier, programme et formation sont du même pays. */
async function lire(formData: FormData) {
  const saisie = schemaModeleEtape.safeParse(lireFormulaire(formData));
  if (!saisie.success) return { erreur: echecValidation(saisie.error) };
  const { verifieeAujourdhui, statut, verifieLe, ...champs } = saisie.data;
  const prisma = getPrisma();
  const [metier, programme, formation] = await Promise.all([
    prisma.metier.findUnique({ where: { id: champs.metierId }, select: { pays: true } }),
    champs.programmeId
      ? prisma.programme.findUnique({ where: { id: champs.programmeId }, select: { pays: true } })
      : null,
    champs.formationId
      ? prisma.formation.findUnique({ where: { id: champs.formationId }, select: { pays: true } })
      : null,
  ]);
  if (!metier) return { erreur: echec("Métier introuvable.", { metierId: "Choisis un métier." }) };
  if (programme && programme.pays !== metier.pays) {
    return {
      erreur: echec("Le programme doit être du même pays que le métier.", {
        programmeId: "Autre pays.",
      }),
    };
  }
  if (formation && formation.pays !== metier.pays) {
    return {
      erreur: echec("La formation doit être du même pays que le métier.", {
        formationId: "Autre pays.",
      }),
    };
  }
  return {
    donnees: {
      ...champs,
      ...statutEtVerification({ statut, verifieLe, verifieeAujourdhui }, new Date()),
    },
  };
}

const ERREUR_DOUBLON = echec(
  "Une étape existe déjà à cette position pour ce métier et cette voie. Modifie-la plutôt.",
  { ordre: "Position déjà prise." },
);

export async function creerModeleEtape(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const { erreur, donnees } = await lire(formData);
  if (erreur) return erreur;
  let id: string;
  try {
    id = (await getPrisma().modeleEtape.create({ data: donnees })).id;
  } catch (e) {
    if (estErreurUnicite(e)) return ERREUR_DOUBLON;
    throw e;
  }
  await journaliser({ type: "ADMIN", id: admin.id }, "modele_etape.creer", `ModeleEtape:${id}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/modeles-etapes/${id}?ok=cree`);
}

export async function modifierModeleEtape(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const { erreur, donnees } = await lire(formData);
  if (erreur) return erreur;
  try {
    await getPrisma().modeleEtape.update({ where: { id }, data: donnees });
  } catch (e) {
    if (estErreurUnicite(e)) return ERREUR_DOUBLON;
    throw e;
  }
  await journaliser({ type: "ADMIN", id: admin.id }, "modele_etape.modifier", `ModeleEtape:${id}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/modeles-etapes?metier=${donnees.metierId}&ok=enregistre`);
}

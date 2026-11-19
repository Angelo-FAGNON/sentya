"use server";
// Métiers : fiche, compétences liées (poids 1 à 3) et formations liées.
import { getPrisma } from "@sentya/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echec, echecValidation, type EtatFormulaire } from "@/lib/etat-formulaire";
import { estErreurUnicite, statutEtVerification } from "@/lib/fiche";
import { exigerAdmin } from "@/lib/garde";
import { journaliser } from "@/lib/journal-acces";
import { lireFormulaire, schemaLienCompetence, schemaMetier } from "@/lib/schemas";

export async function creerMetier(
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaMetier.safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const { verifieeAujourdhui, statut, verifieLe, ...champs } = saisie.data;
  try {
    await getPrisma().metier.create({
      data: {
        ...champs,
        ...statutEtVerification({ statut, verifieLe, verifieeAujourdhui }, new Date()),
      },
    });
  } catch (erreur) {
    if (estErreurUnicite(erreur)) {
      return echec("Cet identifiant existe déjà.", { id: "Choisis un autre identifiant." });
    }
    throw erreur;
  }
  await journaliser({ type: "ADMIN", id: admin.id }, "metier.creer", `Metier:${champs.id}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/metiers/${champs.id}?ok=cree`);
}

export async function modifierMetier(
  id: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const saisie = schemaMetier.omit({ id: true }).safeParse(lireFormulaire(formData));
  if (!saisie.success) return echecValidation(saisie.error);
  const { verifieeAujourdhui, statut, verifieLe, ...champs } = saisie.data;
  await getPrisma().metier.update({
    where: { id },
    data: {
      ...champs,
      ...statutEtVerification({ statut, verifieLe, verifieeAujourdhui }, new Date()),
    },
  });
  await journaliser({ type: "ADMIN", id: admin.id }, "metier.modifier", `Metier:${id}`);
  revalidatePath("/admin", "layout");
  redirect("/admin/metiers?ok=enregistre");
}

/**
 * Compétences du métier. Champs reçus :
 * - "poids:<competenceId>" pour chaque lien existant (0 retire le lien) ;
 * - "ajout-competence-N" et "ajout-poids-N" pour les nouvelles lignes.
 */
export async function enregistrerCompetencesMetier(
  metierId: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const liens = new Map<string, number>();
  const erreurs: Record<string, string> = {};
  for (const [cle, valeur] of formData.entries()) {
    if (typeof valeur !== "string") continue;
    if (cle.startsWith("poids:")) {
      const lien = schemaLienCompetence.safeParse({ competenceId: cle.slice(6), poids: valeur });
      if (lien.success) liens.set(lien.data.competenceId, lien.data.poids);
      else erreurs[cle] = "Poids invalide.";
    }
    const ajout = /^ajout-competence-(\d+)$/.exec(cle);
    if (ajout && valeur) {
      const poids = formData.get(`ajout-poids-${ajout[1]}`);
      const lien = schemaLienCompetence.safeParse({ competenceId: valeur, poids });
      if (lien.success) liens.set(lien.data.competenceId, lien.data.poids);
      else erreurs[`ajout-poids-${ajout[1]}`] = "Choisis un poids de 1 à 3.";
    }
  }
  if (Object.keys(erreurs).length > 0) return echec("Un poids est invalide.", erreurs);

  const prisma = getPrisma();
  const aGarder = [...liens].filter(([, poids]) => poids > 0);
  const existantes = await prisma.competence.count({
    where: { id: { in: aGarder.map(([id]) => id) } },
  });
  if (existantes !== aGarder.length) return echec("Une compétence choisie n'existe pas.");

  await prisma.$transaction([
    prisma.metierCompetence.deleteMany({
      where: {
        metierId,
        competenceId: { in: [...liens].filter(([, p]) => p === 0).map(([id]) => id) },
      },
    }),
    ...aGarder.map(([competenceId, poids]) =>
      prisma.metierCompetence.upsert({
        where: { metierId_competenceId: { metierId, competenceId } },
        create: { metierId, competenceId, poids },
        update: { poids },
      }),
    ),
  ]);
  await journaliser({ type: "ADMIN", id: admin.id }, "metier.competences", `Metier:${metierId}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/metiers/${metierId}?ok=enregistre`);
}

/** Formations liées : cases à cocher "formations" (formations du même pays). */
export async function enregistrerFormationsMetier(
  metierId: string,
  _etat: EtatFormulaire,
  formData: FormData,
): Promise<EtatFormulaire> {
  const admin = await exigerAdmin("referentiel");
  const prisma = getPrisma();
  const metier = await prisma.metier.findUnique({
    where: { id: metierId },
    select: { pays: true },
  });
  if (!metier) return echec("Métier introuvable.");
  const demandees = formData.getAll("formations").filter((v): v is string => typeof v === "string");
  const valides = await prisma.formation.findMany({
    where: { id: { in: demandees }, pays: metier.pays },
    select: { id: true },
  });
  const ids = valides.map((f) => f.id);
  await prisma.$transaction([
    prisma.metierFormation.deleteMany({ where: { metierId, formationId: { notIn: ids } } }),
    prisma.metierFormation.createMany({
      data: ids.map((formationId) => ({ metierId, formationId })),
      skipDuplicates: true,
    }),
  ]);
  await journaliser({ type: "ADMIN", id: admin.id }, "metier.formations", `Metier:${metierId}`);
  revalidatePath("/admin", "layout");
  redirect(`/admin/metiers/${metierId}?ok=enregistre`);
}

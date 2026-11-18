// RG-07 (candidature avec accord), RG-11 (suppression réelle), RG-12 (anonymisation à 12 mois),
// lien magique à usage unique.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { genererPistes } from "../../src/orientation/pistes";
import { creerPlan } from "../../src/orientation/plan";
import { anonymiserInactifs } from "../../src/regles/anonymisation";
import {
  CandidatureImpossibleError,
  candidaturesDuPartenaire,
  postuler,
} from "../../src/regles/candidature";
import { creerProfil } from "../../src/regles/consentement";
import { signalerOpportunite } from "../../src/regles/fraude";
import { consommerLienMagique, creerLienMagique } from "../../src/regles/lien-magique";
import { supprimerUtilisateur } from "../../src/regles/suppression";
import {
  contexteTest,
  creerJeune,
  creerOpportuniteVerifiee,
  creerReferentiel,
  prismaTest,
  repondeurDeterministe,
  viderBase,
} from "../outils/base";

const prisma = prismaTest();
beforeEach(async () => {
  await viderBase();
  await creerReferentiel();
});
afterAll(() => prisma.$disconnect());

/** Jeune avec toutes ses données : bilan, compétences, pistes, plan, signalement, candidature, lien. */
async function jeuneComplet(ctx: ReturnType<typeof contexteTest>["ctx"], idCanal = "500") {
  const user = await creerJeune(ctx, idCanal);
  await prisma.conversationState.create({ data: { userId: user.id, etape: "PLAN", donnees: {} } });
  await prisma.bilanReponse.create({
    data: { userId: user.id, question: "activites", texte: "Je couds.", sourceType: "TEXTE" },
  });
  await prisma.userCompetence.create({
    data: { userId: user.id, competenceId: "couture", origine: "BILAN", validee: true },
  });
  const pistes = await genererPistes(ctx, {
    userId: user.id,
    userHash: user.userHash,
    pays: "BJ",
    objectif: "EMPLOI",
    niveauEtudes: null,
    competenceIds: ["couture"],
    activites: [],
  });
  await creerPlan(ctx, { userId: user.id, pisteId: pistes[0]!.id });
  const o = await creerOpportuniteVerifiee(prisma);
  await signalerOpportunite(ctx, { opportuniteId: o.id, userId: user.id, motif: "Doute" });
  await postuler(ctx, { userId: user.id, opportuniteId: o.id, accordExplicite: true });
  await creerLienMagique(ctx, user.id);
  await prisma.revueQualite.create({
    data: { semaine: "2026-W47", userHash: user.userHash, conversationAnonymisee: {} },
  });
  return { user, opportunite: o };
}

describe("RG-07 : partage du profil", () => {
  it("crée la candidature avec la date d'accord, visible du seul partenaire concerné", async () => {
    const { ctx } = contexteTest(repondeurDeterministe);
    const { user, opportunite } = await jeuneComplet(ctx);
    const c = await prisma.candidature.findFirstOrThrow();
    expect(c.consentAt).toEqual(ctx.horloge.maintenant());
    const recues = await candidaturesDuPartenaire(prisma, opportunite.partenaireId!);
    expect(recues).toHaveLength(1);
    expect(recues[0]!.profil).toEqual({
      prenom: "Afi",
      ville: null,
      niveauEtudes: null,
      competences: ["Couture"],
    });
    expect(JSON.stringify(recues)).not.toContain(user.userHash);
    const autre = await prisma.partenaire.create({
      data: { type: "EMPLOYEUR", nom: "Autre", pays: "BJ", contactOfficiel: "x" },
    });
    expect(await candidaturesDuPartenaire(prisma, autre.id)).toHaveLength(0);
  });

  it("refuse sans accord explicite, ou si le partenaire n'est pas validé", async () => {
    const { ctx } = contexteTest();
    const user = await creerJeune(ctx);
    const o = await creerOpportuniteVerifiee(prisma, { partenaireValide: false });
    await expect(
      postuler(ctx, {
        userId: user.id,
        opportuniteId: o.id,
        accordExplicite: false as unknown as true,
      }),
    ).rejects.toBeInstanceOf(CandidatureImpossibleError);
    await expect(
      postuler(ctx, { userId: user.id, opportuniteId: o.id, accordExplicite: true }),
    ).rejects.toBeInstanceOf(CandidatureImpossibleError);
    expect(await prisma.candidature.count()).toBe(0);
  });
});

describe("RG-11 : suppression réelle", () => {
  it("efface toutes les données du jeune et rompt le lien analytique", async () => {
    const { ctx } = contexteTest(repondeurDeterministe);
    const { user } = await jeuneComplet(ctx);
    const autre = await jeuneComplet(ctx, "501");

    expect(await supprimerUtilisateur(prisma, user.id, ctx.horloge.maintenant())).toBe(true);

    const restant = async (where: object) => ({
      user: await prisma.user.count({ where: { id: user.id } }),
      etat: await prisma.conversationState.count({ where: { userId: user.id } }),
      bilan: await prisma.bilanReponse.count({ where }),
      competences: await prisma.userCompetence.count({ where }),
      pistes: await prisma.piste.count({ where }),
      plans: await prisma.plan.count({ where }),
      signalements: await prisma.signalement.count({ where }),
      candidatures: await prisma.candidature.count({ where }),
      liens: await prisma.magicLink.count({ where }),
    });
    expect(Object.values(await restant({ userId: user.id })).every((n) => n === 0)).toBe(true);
    expect(await prisma.planEtape.count({ where: { plan: { userId: user.id } } })).toBe(0);
    expect(await prisma.evenementAnalytique.count({ where: { userHash: user.userHash } })).toBe(0);
    expect(await prisma.recommandationLog.count({ where: { userHash: user.userHash } })).toBe(0);
    expect(await prisma.revueQualite.count({ where: { userHash: user.userHash } })).toBe(0);
    // Les chiffres restent (événements re-hachés), et l'autre jeune n'est pas touché.
    expect(await prisma.evenementAnalytique.count({ where: { type: "plan_cree" } })).toBe(2);
    expect(await prisma.plan.count({ where: { userId: autre.user.id } })).toBe(1);
  });

  it("renvoie false pour un jeune inconnu", async () => {
    expect(await supprimerUtilisateur(prisma, "inconnu", new Date())).toBe(false);
  });
});

describe("RG-12 : anonymisation après 12 mois d'inactivité", () => {
  it("anonymise les inactifs et permet de recréer un profil", async () => {
    const { ctx, horloge } = contexteTest(repondeurDeterministe);
    const { user } = await jeuneComplet(ctx);
    horloge.avancerJours(200);
    const actif = await creerJeune(ctx, "777", "Kodjo");
    horloge.avancerJours(200);

    expect(await anonymiserInactifs(prisma, horloge.maintenant())).toBe(1);
    const anonyme = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(anonyme).toMatchObject({
      telegramId: null,
      prenom: null,
      ville: null,
      anonymiseLe: horloge.maintenant(),
    });
    expect(anonyme.userHash).not.toBe(user.userHash);
    expect(await prisma.bilanReponse.count({ where: { userId: user.id } })).toBe(0);
    expect(
      await prisma.rappel.count({ where: { plan: { userId: user.id }, envoyeLe: null } }),
    ).toBe(0);
    expect(await prisma.evenementAnalytique.count({ where: { userHash: user.userHash } })).toBe(0);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: actif.id } })).anonymiseLe,
    ).toBeNull();

    // La même personne revient : un nouveau profil est créé sans conflit d'unicité.
    const retour = await creerProfil(ctx, {
      canal: "TELEGRAM",
      idCanal: "500",
      pays: "BJ",
      consentement: true,
      majeur: true,
    });
    expect(retour.cree).toBe(true);
    expect(await anonymiserInactifs(prisma, horloge.maintenant())).toBe(0);
  });
});

describe("EF-11 : lien magique", () => {
  it("fonctionne une seule fois et expire après 15 minutes", async () => {
    const { ctx, horloge } = contexteTest();
    const user = await creerJeune(ctx);
    const url = await creerLienMagique(ctx, user.id);
    expect(url).toMatch(/^https:\/\/sentya\.test\/monplan\/[\w-]{40,}$/);
    const jeton = url.split("/").pop()!;
    expect(await prisma.magicLink.count({ where: { tokenHash: jeton } })).toBe(0);
    expect(await consommerLienMagique(prisma, jeton, horloge.maintenant())).toBe(user.id);
    expect(await consommerLienMagique(prisma, jeton, horloge.maintenant())).toBeNull();

    const autre = (await creerLienMagique(ctx, user.id)).split("/").pop()!;
    horloge.avancer(16 * 60_000);
    expect(await consommerLienMagique(prisma, autre, horloge.maintenant())).toBeNull();
  });
});

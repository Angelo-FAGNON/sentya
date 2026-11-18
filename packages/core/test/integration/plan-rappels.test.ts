// EF-07 et EF-08 : plan construit depuis la base, opportunité vérifiée, rappels J+3/J+7/J+30
// avec une horloge simulée, idempotence et changement de piste.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { formaterDate } from "../../src/dates";
import { genererPistes } from "../../src/orientation/pistes";
import { changerStatutEtape, creerPlan, formaterPlan, planActif } from "../../src/orientation/plan";
import { reserverRappel } from "../../src/regles/rappels";
import { calculerIndicateurs } from "../../src/analytique/indicateurs";
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

async function preparer(ctx: ReturnType<typeof contexteTest>["ctx"]) {
  const user = await creerJeune(ctx);
  const pistes = await genererPistes(ctx, {
    userId: user.id,
    userHash: user.userHash,
    pays: "BJ",
    objectif: "EMPLOI",
    niveauEtudes: null,
    competenceIds: ["couture", "vente"],
    activites: [],
  });
  return { user, pistes };
}

describe("EF-07 : plan en 3 étapes", () => {
  it("reprend les modèles d'étapes et les programmes de la base, sans invention", async () => {
    const { ctx } = contexteTest(repondeurDeterministe);
    const { user, pistes } = await preparer(ctx);
    const couture = pistes.find((p) => p.metierId === "bj-couture")!;
    const plan = await creerPlan(ctx, { userId: user.id, pisteId: couture.id });

    expect(plan.etapes).toHaveLength(3);
    const modeles = await prisma.modeleEtape.findMany({
      where: { metierId: "bj-couture", voie: couture.voie },
      orderBy: { ordre: "asc" },
    });
    expect(plan.etapes.map((e) => e.titre)).toEqual(modeles.map((m) => m.titre));
    expect(plan.etapes[0]!.details).toContain("Azôli");
    expect(plan.etapes[0]!.details).toContain("Contact : À vérifier par le curateur");
    expect(plan.etapes.every((e) => e.sourceUrl.startsWith("https://"))).toBe(true);
    expect(formaterDate(plan.etapes[0]!.echeance)).toBe("25/11/2026");
    expect(await prisma.piste.findUniqueOrThrow({ where: { id: couture.id } })).toMatchObject({
      choisie: true,
    });

    const messages = formaterPlan(plan);
    expect(messages[0]).toBe("Voici ton plan en 3 étapes.");
    expect(messages.at(-1)).toMatch(/^Je te rappelle dans 3 jours\. Ta première action/);
  });

  it("ajoute une opportunité uniquement si elle est VERIFIEE", async () => {
    const { ctx } = contexteTest(repondeurDeterministe);
    const { user, pistes } = await preparer(ctx);
    const brouillon = await creerOpportuniteVerifiee(prisma);
    await prisma.opportunite.update({ where: { id: brouillon.id }, data: { statut: "BROUILLON" } });
    const couture = pistes.find((p) => p.metierId === "bj-couture")!;
    let plan = await creerPlan(ctx, { userId: user.id, pisteId: couture.id });
    expect(plan.etapes.some((e) => e.opportuniteId)).toBe(false);

    await prisma.opportunite.update({ where: { id: brouillon.id }, data: { statut: "VERIFIEE" } });
    await prisma.plan.deleteMany();
    plan = await creerPlan(ctx, { userId: user.id, pisteId: couture.id });
    const etape2 = plan.etapes[1]!;
    expect(etape2.opportuniteId).toBe(brouillon.id);
    expect(etape2.details).toContain("Vérifiée le 01/11/2026");
  });
});

describe("EF-08 : rappels J+3, J+7, J+30", () => {
  it("partent aux bonnes dates, une seule fois chacun", async () => {
    const { ctx, horloge } = contexteTest(repondeurDeterministe);
    const { user, pistes } = await preparer(ctx);
    const plan = await creerPlan(ctx, { userId: user.id, pisteId: pistes[0]!.id });
    const rappel = (type: string) => plan.rappels.find((r) => r.type === type)!;

    horloge.avancerJours(2);
    expect(await reserverRappel(prisma, rappel("J3").id, horloge.maintenant())).toBeNull();
    horloge.avancerJours(1);
    const envoye = await reserverRappel(prisma, rappel("J3").id, horloge.maintenant());
    expect(envoye?.plan.user.telegramId).toBe(1001n);
    expect(envoye?.plan.etapes).toHaveLength(3);
    expect(await reserverRappel(prisma, rappel("J3").id, horloge.maintenant())).toBeNull();

    horloge.avancerJours(4);
    expect(await reserverRappel(prisma, rappel("J7").id, horloge.maintenant())).not.toBeNull();
    horloge.avancerJours(23);
    expect(await reserverRappel(prisma, rappel("J30").id, horloge.maintenant())).not.toBeNull();
    expect(await prisma.rappel.count({ where: { envoyeLe: null } })).toBe(0);
  });

  it("le changement de piste désactive l'ancien plan et ses rappels", async () => {
    const { ctx, horloge } = contexteTest(repondeurDeterministe);
    const { user, pistes } = await preparer(ctx);
    const ancien = await creerPlan(ctx, { userId: user.id, pisteId: pistes[0]!.id });
    const nouveau = await creerPlan(ctx, { userId: user.id, pisteId: pistes[1]!.id });
    expect((await planActif(prisma, user.id))?.id).toBe(nouveau.id);
    expect(await prisma.rappel.count({ where: { planId: ancien.id } })).toBe(0);
    horloge.avancerJours(3);
    expect(
      await reserverRappel(
        prisma,
        nouveau.rappels.find((r) => r.type === "J3")!.id,
        horloge.maintenant(),
      ),
    ).not.toBeNull();
  });

  it("exige une raison pour Bloqué et Abandonné, et alimente l'indicateur clé", async () => {
    const { ctx, horloge } = contexteTest(repondeurDeterministe);
    const { user, pistes } = await preparer(ctx);
    const plan = await creerPlan(ctx, { userId: user.id, pisteId: pistes[0]!.id });
    const [e1, e2] = plan.etapes;
    await expect(
      changerStatutEtape(ctx, { userId: user.id, etapeId: e2!.id, statut: "BLOQUE" }),
    ).rejects.toThrow();
    horloge.avancerJours(10);
    await changerStatutEtape(ctx, { userId: user.id, etapeId: e1!.id, statut: "FAIT" });
    await changerStatutEtape(ctx, {
      userId: user.id,
      etapeId: e2!.id,
      statut: "BLOQUE",
      raison: "Pas de transport.",
    });
    expect(await prisma.planEtape.findUniqueOrThrow({ where: { id: e2!.id } })).toMatchObject({
      statut: "BLOQUE",
      raison: "Pas de transport.",
    });

    horloge.avancerJours(35);
    const indicateurs = await calculerIndicateurs(prisma, horloge.maintenant());
    expect(indicateurs.partEtapesRealisees30j).toBeCloseTo(1 / 3, 3);
  });
});

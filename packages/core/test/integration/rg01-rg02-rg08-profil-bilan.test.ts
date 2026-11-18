// RG-01 (consentement), RG-02 (18 ans), RG-08 (données sensibles jamais stockées).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { QUESTIONS_BILAN, enregistrerReponse } from "../../src/orientation/bilan";
import { ConsentementRequisError, creerProfil } from "../../src/regles/consentement";
import { contexteTest, creerJeune, prismaTest, viderBase } from "../outils/base";

const prisma = prismaTest();
beforeEach(() => viderBase());
afterAll(() => prisma.$disconnect());

const compterTout = async () =>
  (await prisma.user.count()) +
  (await prisma.conversationState.count()) +
  (await prisma.bilanReponse.count()) +
  (await prisma.evenementAnalytique.count());

describe("RG-01 et RG-02 : création du profil", () => {
  it("refuse sans consentement et n'écrit rien", async () => {
    const { ctx } = contexteTest();
    await expect(
      creerProfil(ctx, {
        canal: "TELEGRAM",
        idCanal: "42",
        pays: "BJ",
        consentement: false,
        majeur: true,
      }),
    ).rejects.toBeInstanceOf(ConsentementRequisError);
    expect(await compterTout()).toBe(0);
  });

  it("refuse un mineur et n'écrit rien", async () => {
    const { ctx } = contexteTest();
    await expect(
      creerProfil(ctx, {
        canal: "TELEGRAM",
        idCanal: "42",
        pays: "TG",
        consentement: true,
        majeur: false,
      }),
    ).rejects.toBeInstanceOf(ConsentementRequisError);
    expect(await compterTout()).toBe(0);
  });

  it("crée le profil avec consentement et âge, sans dupliquer", async () => {
    const { ctx } = contexteTest();
    const demande = {
      canal: "TELEGRAM" as const,
      idCanal: "42",
      pays: "BJ" as const,
      consentement: true,
      majeur: true,
      sourceAcquisition: "QR code!",
    };
    const a = await creerProfil(ctx, demande);
    const b = await creerProfil(ctx, demande);
    expect(a.cree).toBe(true);
    expect(b.cree).toBe(false);
    expect(a.user).toMatchObject({
      ageConfirmed: true,
      telegramId: 42n,
      sourceAcquisition: "qrcode",
    });
    expect(a.user.consentAt).toEqual(ctx.horloge.maintenant());
    expect(await prisma.user.count()).toBe(1);
    const evenement = await prisma.evenementAnalytique.findFirstOrThrow();
    expect(JSON.stringify(evenement)).not.toContain('42"');
    expect(evenement.userHash).toBe(a.user.userHash);
  });
});

describe("RG-08 : données sensibles", () => {
  it("n'enregistre jamais la phrase sensible", async () => {
    const { ctx } = contexteTest();
    const user = await creerJeune(ctx);
    const question = QUESTIONS_BILAN[0]!;
    const r = await enregistrerReponse(ctx, {
      userId: user.id,
      userHash: user.userHash,
      question,
      texte: "Je couds des robes depuis 3 ans. Je suis séropositive. Je prie à la mosquée.",
      sourceType: "TEXTE",
    });
    expect(r).toEqual({ statut: "ENREGISTREE", donneesRetirees: true });
    const stockees = await prisma.bilanReponse.findMany();
    expect(stockees.map((s) => s.texte)).toEqual(["Je couds des robes depuis 3 ans."]);
    const evenement = await prisma.evenementAnalytique.findFirstOrThrow({
      where: { type: "donnees_sensibles_filtrees" },
    });
    expect(JSON.stringify(evenement.payload)).not.toMatch(/séropositive|mosquée/);
  });

  it("n'enregistre rien si toute la réponse est sensible", async () => {
    const { ctx } = contexteTest();
    const user = await creerJeune(ctx);
    const r = await enregistrerReponse(ctx, {
      userId: user.id,
      userHash: user.userHash,
      question: QUESTIONS_BILAN[0]!,
      texte: "Je suis malade et je vais à l'église.",
      sourceType: "VOCAL",
    });
    expect(r.statut).toBe("VIDE_APRES_FILTRE");
    expect(await prisma.bilanReponse.count()).toBe(0);
  });

  it("met à jour la ville, les études et l'objectif du profil", async () => {
    const { ctx } = contexteTest();
    const user = await creerJeune(ctx);
    for (const [cle, texte] of [
      ["ville", "Parakou"],
      ["etudes", "Pas de diplôme"],
      ["objectif", "Ma propre activité"],
    ] as const) {
      await enregistrerReponse(ctx, {
        userId: user.id,
        userHash: user.userHash,
        question: QUESTIONS_BILAN.find((q) => q.cle === cle)!,
        texte,
        sourceType: "TEXTE",
      });
    }
    expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({
      ville: "Parakou",
      niveauEtudes: "AUCUN_DIPLOME",
      objectif: "PROPRE_ACTIVITE",
    });
  });
});

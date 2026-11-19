// RG-03 (ancrage), journalisation des recommandations, IA indisponible, égalité de traitement.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { IAIndisponibleError } from "../../src/ia/fournisseur";
import { extraireCompetences } from "../../src/orientation/competences";
import { genererPistes } from "../../src/orientation/pistes";
import {
  contexteTest,
  creerJeune,
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

const profil = (user: { id: string; userHash: string }) => ({
  userId: user.id,
  userHash: user.userHash,
  pays: "BJ" as const,
  objectif: "EMPLOI" as const,
  niveauEtudes: "AUCUN_DIPLOME" as const,
  competenceIds: ["couture", "vente"],
  activites: [{ libelle: "couture de vêtements", dureeMois: 36 }],
});

describe("RG-03 : pistes ancrées sur le référentiel", () => {
  it("rejette les métiers inventés par l'IA et complète avec des pistes à explorer", async () => {
    const { ctx } = contexteTest(() => ({
      pistes: [
        {
          metierId: "bj-couture",
          voie: "EMPLOI",
          raison: "Tu couds depuis 3 ans.",
          conditionPrincipale: "Trouver un atelier.",
        },
        {
          metierId: "bj-astronaute",
          voie: "EMPLOI",
          raison: "Invention.",
          conditionPrincipale: "Aucune.",
        },
        {
          metierId: "tg-couture",
          voie: "EMPLOI",
          raison: "Autre pays.",
          conditionPrincipale: "Aucune.",
        },
      ],
    }));
    const user = await creerJeune(ctx);
    const pistes = await genererPistes(ctx, profil(user));

    expect(pistes).toHaveLength(3);
    expect(pistes[0]).toMatchObject({ metierId: "bj-couture", aExplorer: false });
    expect(pistes.slice(1).every((p) => p.aExplorer)).toBe(true);
    const enBase = await prisma.piste.findMany({ include: { metier: true } });
    expect(enBase.every((p) => p.metier.pays === "BJ")).toBe(true);

    const log = await prisma.recommandationLog.findFirstOrThrow();
    expect(log.idsRejetes).toEqual(["bj-astronaute", "tg-couture"]);
    expect(log.promptVersion).toBe("choix-pistes@2");
    expect(log.metierIdsProposes).toEqual(pistes.map((p) => p.metierId));
    expect(JSON.stringify(log)).not.toContain("Afi");
  });

  it("chaque piste porte sa source et sa date de vérification", async () => {
    const { ctx } = contexteTest(repondeurDeterministe);
    const pistes = await genererPistes(ctx, profil(await creerJeune(ctx)));
    for (const p of pistes) {
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      expect(p).toHaveProperty("verifieLe");
    }
  });

  it("lève IAIndisponibleError si Gemini ne répond pas, sans rien enregistrer", async () => {
    const { ctx } = contexteTest(() => {
      throw new IAIndisponibleError("panne");
    });
    const user = await creerJeune(ctx);
    await expect(genererPistes(ctx, profil(user))).rejects.toBeInstanceOf(IAIndisponibleError);
    expect(await prisma.piste.count()).toBe(0);
  });

  it("au dernier essai, produit 3 pistes à explorer sans IA", async () => {
    const { ctx } = contexteTest(() => {
      throw new IAIndisponibleError("panne");
    });
    const pistes = await genererPistes(ctx, profil(await creerJeune(ctx)), {
      repliSiIndisponible: true,
    });
    expect(pistes).toHaveLength(3);
    expect(pistes.every((p) => p.aExplorer)).toBe(true);
    expect((await prisma.recommandationLog.findFirstOrThrow()).repliTotal).toBe(true);
  });
});

describe("Égalité de traitement", () => {
  it("deux profils identiques sauf le prénom reçoivent les mêmes pistes", async () => {
    const { ctx, ia } = contexteTest(repondeurDeterministe);
    const afi = await creerJeune(ctx, "2001", "Afi");
    const kossi = await creerJeune(ctx, "2002", "Kossi");
    const pistesAfi = await genererPistes(ctx, profil(afi));
    const pistesKossi = await genererPistes(ctx, profil(kossi));

    const resume = (l: typeof pistesAfi) =>
      l.map((p) => [p.metierId, p.voie, p.raison, p.aExplorer]);
    expect(resume(pistesAfi)).toEqual(resume(pistesKossi));
    const [requeteAfi, requeteKossi] = ia.appelsPour("choix-pistes");
    expect(requeteAfi?.texte).toBe(requeteKossi?.texte);
  });

  it("l'extraction reçoit le même texte quel que soit le prénom", async () => {
    const { ctx, ia } = contexteTest(repondeurDeterministe);
    const bilan = (prenom: string) => [
      { question: "activites", texte: `Moi c'est ${prenom}. Je couds depuis 3 ans.` },
    ];
    await extraireCompetences(ctx, { reponses: bilan("Afi"), nomsConnus: ["Afi"] });
    await extraireCompetences(ctx, { reponses: bilan("Kossi"), nomsConnus: ["Kossi"] });
    const [a, b] = ia.appelsPour("extraction-competences");
    expect(a?.texte).toBe(b?.texte);
    expect(a?.texte).not.toMatch(/Afi|Kossi/);
  });
});

describe("EF-03 : extraction des compétences", () => {
  it("ignore les identifiants inventés et garde ceux du référentiel", async () => {
    const { ctx } = contexteTest(() => ({
      competences: [
        { id: "couture", preuve: "je couds" },
        { id: "pilotage-drone", preuve: "invente" },
      ],
      activites: [],
    }));
    const r = await extraireCompetences(ctx, {
      reponses: [{ question: "activites", texte: "Je couds." }],
    });
    expect(r).toMatchObject({
      competenceIds: ["couture"],
      idsRejetes: ["pilotage-drone"],
      origine: "ia",
    });
  });

  it("utilise le repli par mots-clés après deux sorties invalides", async () => {
    const { ctx, ia } = contexteTest(() => ({ format: "inattendu" }));
    const r = await extraireCompetences(ctx, {
      reponses: [{ question: "activites", texte: "Je répare les motos et je vends au marché." }],
    });
    expect(ia.appels).toHaveLength(2);
    expect(r.origine).toBe("repli");
    expect(r.competenceIds.sort()).toEqual(["mecanique-moto", "vente"]);
  });
});

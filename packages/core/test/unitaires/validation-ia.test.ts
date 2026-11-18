// Sorties de l'IA : validation zod, une seule nouvelle tentative, puis repli.
import { ApiError } from "@google/genai";
import { describe, expect, it } from "vitest";
import { appelerAvecSchema } from "../../src/ia/appel-structure";
import { FournisseurFactice } from "../../src/ia/factice";
import { IAIndisponibleError, SortieIAInvalideError } from "../../src/ia/fournisseur";
import { classerErreurGemini } from "../../src/ia/gemini";
import { schemaChoixPistes, schemaExtraction, versJsonSchema } from "../../src/ia/schemas";
import { journalSilencieux } from "../../src/journal";

const parametres = {
  version: "choix-pistes@1",
  systeme: "systeme",
  texte: "{}",
  schema: schemaChoixPistes,
  delaiMs: 1000,
};
const valide = {
  pistes: [
    {
      metierId: "bj-couture",
      voie: "EMPLOI",
      raison: "Tu couds bien.",
      conditionPrincipale: "Un atelier.",
    },
  ],
};

describe("appelerAvecSchema", () => {
  it("renvoie la sortie valide dès la première tentative", async () => {
    const ia = new FournisseurFactice(() => valide);
    const r = await appelerAvecSchema(ia, parametres, journalSilencieux);
    expect(r).toMatchObject({ ok: true, tentatives: 1 });
    expect(ia.appels).toHaveLength(1);
  });

  it("refait UNE seule tentative après une sortie invalide", async () => {
    const ia = new FournisseurFactice((_r, n) =>
      n === 1 ? { pistes: [{ metierId: 3 }] } : valide,
    );
    const r = await appelerAvecSchema(ia, parametres, journalSilencieux);
    expect(r).toMatchObject({ ok: true, tentatives: 2 });
  });

  it("abandonne après deux échecs pour laisser place au repli", async () => {
    const ia = new FournisseurFactice(() => ({ autre: "chose" }));
    const r = await appelerAvecSchema(ia, parametres, journalSilencieux);
    expect(r.ok).toBe(false);
    expect(ia.appels).toHaveLength(2);
  });

  it("traite un JSON illisible comme une sortie invalide", async () => {
    const ia = new FournisseurFactice(() => {
      throw new SortieIAInvalideError("JSON invalide");
    });
    expect((await appelerAvecSchema(ia, parametres, journalSilencieux)).ok).toBe(false);
  });

  it("propage l'indisponibilité sans réessayer", async () => {
    const ia = new FournisseurFactice(() => {
      throw new IAIndisponibleError("panne");
    });
    await expect(appelerAvecSchema(ia, parametres, journalSilencieux)).rejects.toBeInstanceOf(
      IAIndisponibleError,
    );
    expect(ia.appels).toHaveLength(1);
  });

  it("refuse plus de 3 pistes et une voie inconnue", () => {
    const quatre = { pistes: Array.from({ length: 4 }, () => valide.pistes[0]) };
    expect(schemaChoixPistes.safeParse(quatre).success).toBe(false);
    expect(
      schemaChoixPistes.safeParse({ pistes: [{ ...valide.pistes[0], voie: "STAGE" }] }).success,
    ).toBe(false);
  });

  it("transmet un JSON Schema sans clé $schema", () => {
    const json = versJsonSchema(schemaExtraction);
    expect(json).not.toHaveProperty("$schema");
    expect(json).toHaveProperty("properties");
  });
});

describe("classerErreurGemini", () => {
  it("classe 429 et 503 comme indisponibilité, 400 comme sortie invalide", () => {
    expect(classerErreurGemini(new ApiError({ message: "quota", status: 429 }))).toBeInstanceOf(
      IAIndisponibleError,
    );
    expect(classerErreurGemini(new ApiError({ message: "panne", status: 503 }))).toBeInstanceOf(
      IAIndisponibleError,
    );
    expect(classerErreurGemini(new ApiError({ message: "mauvais", status: 400 }))).toBeInstanceOf(
      SortieIAInvalideError,
    );
  });
  it("classe un délai dépassé comme indisponibilité", () => {
    const e = new Error("trop long");
    e.name = "TimeoutError";
    expect(classerErreurGemini(e)).toBeInstanceOf(IAIndisponibleError);
  });
});

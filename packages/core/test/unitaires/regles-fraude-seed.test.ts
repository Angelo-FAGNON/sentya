// RG-05 et EF-10 : les règles de fraude du seed fonctionnent avec le vrai moteur de détection
// du noyau (limites de mots pour MOT_CLE, drapeaux "iu" pour REGEX), sur leurs exemples.
import { describe, expect, it } from "vitest";
import { REGLES_FRAUDE } from "../../../db/prisma/seed-data/regles-fraude";
import { analyserTexteOffre } from "../../src/regles/fraude";

const regles = REGLES_FRAUDE.map((r) => ({ ...r, actif: true }));

describe("règles de fraude du seed", () => {
  it("contient au moins 10 règles, dont des règles bloquantes pour les frais", () => {
    expect(regles.length).toBeGreaterThanOrEqual(10);
    expect(regles.some((r) => r.categorie === "FRAIS_CANDIDAT" && r.bloquante)).toBe(true);
  });

  it("chaque expression régulière se compile avec les drapeaux du noyau", () => {
    for (const r of regles.filter((x) => x.typeMotif === "REGEX")) {
      expect(() => new RegExp(r.motif, "iu"), r.id).not.toThrow();
    }
  });

  it.each(regles.map((r) => [r.id, r] as const))(
    "%s : se déclenche sur ses exemples, pas sur ses contre-exemples",
    (_id, regle) => {
      for (const texte of regle.exemplesPositifs) {
        const ids = analyserTexteOffre(texte, regles).motifs.map((m) => m.regleId);
        expect(ids, texte).toContain(regle.id);
      }
      for (const texte of regle.exemplesNegatifs) {
        const ids = analyserTexteOffre(texte, regles).motifs.map((m) => m.regleId);
        expect(ids, texte).not.toContain(regle.id);
      }
    },
  );

  it("refuse une vraie offre frauduleuse écrite avec accents et majuscules", () => {
    const r = analyserTexteOffre(
      "URGENT ! Recrutement. Frais de Dossier : 5 000 F à verser avant l'entretien.",
      regles,
    );
    expect(r.bloquante).toBe(true);
  });
});

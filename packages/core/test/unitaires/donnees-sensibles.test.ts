// RG-08 : les données sensibles ne sont jamais stockées.
import { describe, expect, it } from "vitest";
import { filtrerDonneesSensibles } from "../../src/confidentialite/donnees-sensibles";

describe("RG-08 filtrerDonneesSensibles", () => {
  it("retire une phrase sur la santé et garde le reste", () => {
    const r = filtrerDonneesSensibles(
      "Je suis couturière. J'ai le VIH depuis 2019. J'aime coudre.",
    );
    expect(r.retire).toBe(true);
    expect(r.categories).toContain("SANTE");
    expect(r.texte).toBe("Je suis couturière. J'aime coudre.");
  });

  it("retire religion, appartenance ethnique et opinions politiques", () => {
    const r = filtrerDonneesSensibles(
      "Je vends des pagnes. Je suis musulman. Je suis fon. Je milite dans un parti politique.",
    );
    expect(r.categories.sort()).toEqual(["ORIGINE_ETHNIQUE", "POLITIQUE", "RELIGION"]);
    expect(r.texte).toBe("Je vends des pagnes.");
  });

  it("ne confond pas une langue parlée avec une origine", () => {
    const r = filtrerDonneesSensibles("Je parle fon, éwé et français.");
    expect(r.retire).toBe(false);
  });

  it("ignore les accents et la casse", () => {
    expect(filtrerDonneesSensibles("Je vais à l'ÉGLISE le dimanche.").retire).toBe(true);
  });

  it("laisse intact un texte sans donnée sensible", () => {
    const texte = "Je répare les téléphones depuis 4 ans.";
    expect(filtrerDonneesSensibles(texte)).toEqual({ texte, retire: false, categories: [] });
  });
});

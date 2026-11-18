// Pseudonymisation : aucun nom, numéro, adresse ni e-mail ne doit partir vers l'IA.
import { describe, expect, it } from "vitest";
import { pseudonymiser } from "../../src/confidentialite/pseudonymisation";

describe("pseudonymiser", () => {
  it("retire les e-mails et les liens", () => {
    const r = pseudonymiser("Écris-moi à koffi.mensah@gmail.com ou sur https://facebook.com/koffi");
    expect(r).not.toMatch(/koffi/i);
    expect(r).toContain("[EMAIL]");
    expect(r).toContain("[LIEN]");
  });

  it("retire les numéros du Bénin et du Togo, avec ou sans indicatif", () => {
    const exemples = [
      "Appelle le +229 01 97 12 34 56 demain",
      "mon numéro 0197123456",
      "patron : 97.12.34.56",
      "au Togo c'est le 00228 90 12 34 56",
      "+22890123456",
    ];
    for (const texte of exemples) {
      const r = pseudonymiser(texte);
      expect(r, texte).toContain("[TELEPHONE]");
      expect(r, texte).not.toMatch(/\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}/);
    }
  });

  it("garde les durées, âges et montants courts utiles au bilan", () => {
    const r = pseudonymiser("Je fais la couture depuis 3 ans et je gagne 2000 par jour.");
    expect(r).toContain("3 ans");
    expect(r).toContain("2000");
  });

  it("retire les identifiants longs (pièce, IFU)", () => {
    expect(pseudonymiser("Mon IFU est 3201912345678")).toContain("[NUMERO]");
  });

  it("retire les adresses précises", () => {
    const r = pseudonymiser(
      "J'habite carré 1245, rue 12.345 von de la pharmacie, quartier Zogbo, BP 2045 à Cotonou.",
    );
    expect(r).not.toMatch(/1245|Zogbo|pharmacie|2045/);
    expect(r).toContain("[ADRESSE]");
    expect(r).toContain("Cotonou");
  });

  it("retire le nom après une formule de présentation", () => {
    const r = pseudonymiser("Bonjour, je m'appelle Afi Mensah et je fais la coiffure.");
    expect(r).not.toMatch(/Afi|Mensah/);
    expect(r).toContain("je fais la coiffure");
  });

  it("retire les noms après une relation ou une civilité", () => {
    const r = pseudonymiser(
      "J'ai appris chez Mama Rose avec mon patron Akim, puis avec Mme Adjovi.",
    );
    expect(r).not.toMatch(/Rose|Akim|Adjovi/);
    expect(r).toContain("[NOM]");
  });

  it("retire les noms connus du profil, sans tenir compte des accents ni de la casse", () => {
    const r = pseudonymiser("Moi Sèna, je vends au marché. sena aime vendre.", {
      nomsConnus: ["Sena"],
    });
    expect(r).not.toMatch(/s[eè]na/i);
  });

  it("ne transforme pas un texte sans donnée personnelle", () => {
    const texte = "Je répare les motos depuis 2 ans à Lomé.";
    expect(pseudonymiser(texte)).toBe(texte);
  });
});

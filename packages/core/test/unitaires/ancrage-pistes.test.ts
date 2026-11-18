// RG-03 et RG-09 : les pistes sont toujours ancrées sur le référentiel, sans invention.
import { describe, expect, it } from "vitest";
import { texteIASur, validerEtCompleterPistes } from "../../src/orientation/pistes";
import { preselectionner } from "../../src/orientation/preselection";
import { METIERS_TEST } from "../outils/metiers";

const candidats = preselectionner(METIERS_TEST, ["couture", "vente", "coiffure"], "EMPLOI");
const libelles = new Map([
  ["couture", "Couture"],
  ["vente", "Vente"],
  ["coiffure", "Coiffure"],
]);
const piste = (
  metierId: string,
  voie: "EMPLOI" | "FORMATION_CERTIFICATION" | "AUTO_EMPLOI" = "EMPLOI",
) => ({
  metierId,
  voie,
  raison: "Tu couds depuis 3 ans, c'est une bonne base.",
  conditionPrincipale: "Trouver un atelier pour pratiquer.",
});

describe("RG-03 validerEtCompleterPistes", () => {
  it("rejette tout identifiant hors référentiel et complète avec des pistes à explorer", () => {
    const r = validerEtCompleterPistes(
      { pistes: [piste("bj-couture"), piste("metier-invente"), piste("bj-pilote-avion")] },
      candidats,
      libelles,
    );
    expect(r.idsRejetes).toEqual(["metier-invente", "bj-pilote-avion"]);
    expect(r.pistes).toHaveLength(3);
    expect(r.pistes[0]).toMatchObject({ metierId: "bj-couture", aExplorer: false });
    expect(r.pistes.slice(1).every((p) => p.aExplorer)).toBe(true);
    const connus = new Set(candidats.map((c) => c.metier.id));
    expect(r.pistes.every((p) => connus.has(p.metierId))).toBe(true);
  });

  it("produit 3 pistes à explorer si l'IA a échoué", () => {
    const r = validerEtCompleterPistes(null, candidats, libelles);
    expect(r.pistes).toHaveLength(3);
    expect(r.pistes.every((p) => p.aExplorer)).toBe(true);
    expect(r.pistes[0]?.raison).toContain("couture");
  });

  it("supprime les doublons et ne dépasse jamais 3 pistes", () => {
    const r = validerEtCompleterPistes(
      { pistes: [piste("bj-couture"), piste("bj-couture"), piste("bj-vente")] },
      candidats,
      libelles,
    );
    expect(new Set(r.pistes.map((p) => p.metierId)).size).toBe(3);
  });

  it("corrige une voie indisponible pour le métier", () => {
    const r = validerEtCompleterPistes(
      { pistes: [piste("bj-web", "AUTO_EMPLOI")] },
      preselectionner(METIERS_TEST, ["html"], "PROPRE_ACTIVITE"),
      libelles,
    );
    expect(r.pistes[0]?.voie).not.toBe("AUTO_EMPLOI");
  });

  it("remplace un texte de l'IA qui invente un prix, un contact ou promet un résultat", () => {
    const r = validerEtCompleterPistes(
      {
        pistes: [
          { ...piste("bj-couture"), raison: "Emploi garanti avec un salaire de 150 000 FCFA." },
          { ...piste("bj-vente"), conditionPrincipale: "Appelle le 97 12 34 56." },
        ],
      },
      candidats,
      libelles,
    );
    expect(r.pistes[0]?.raison).not.toMatch(/garanti|FCFA/);
    expect(r.pistes[1]?.conditionPrincipale).not.toMatch(/\d/);
  });
});

describe("texteIASur", () => {
  it("accepte une durée d'expérience courte", () => {
    expect(texteIASur("Tu fais la vente depuis 2 ans au marché.")).toBe(true);
  });
  it.each([
    "Le CQP coûte 50 000 FCFA.",
    "Va sur www.exemple.bj",
    "Écris à contact@exemple.com",
    "La formation dure 450 heures.",
    "Tu es assuré de trouver un emploi.",
    "Contacte [NOM] pour commencer.",
  ])("refuse : %s", (texte) => {
    expect(texteIASur(texte)).toBe(false);
  });
});

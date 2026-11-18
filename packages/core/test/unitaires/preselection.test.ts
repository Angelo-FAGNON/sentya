// EF-05 étape 1 : présélection déterministe, sans IA.
import { describe, expect, it } from "vitest";
import { choisirVoie, preselectionner } from "../../src/orientation/preselection";
import { METIERS_TEST, metier } from "../outils/metiers";

describe("preselectionner", () => {
  it("classe d'abord les métiers qui recouvrent le plus de compétences", () => {
    const r = preselectionner(METIERS_TEST, ["couture", "retouche", "vente"], "EMPLOI");
    expect(r[0]?.metier.id).toBe("bj-couture");
    expect(r[1]?.metier.id).toBe("bj-vente");
    expect(r[0]?.competencesCommunes).toEqual(["couture", "retouche", "vente"]);
  });

  it("exclut les métiers sans modèle d'étapes", () => {
    const r = preselectionner(METIERS_TEST, ["couture"], null);
    expect(r.map((c) => c.metier.id)).not.toContain("bj-sans-modele");
  });

  it("complète jusqu'à 3 candidats même sans recouvrement", () => {
    const r = preselectionner(METIERS_TEST, ["inconnue"], "NE_SAIT_PAS");
    expect(r).toHaveLength(3);
  });

  it("limite à 15 candidats", () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) =>
      metier(`m-${String(i).padStart(2, "0")}`, [["x", 1]]),
    );
    expect(preselectionner(beaucoup, ["x"], null)).toHaveLength(15);
  });

  it("privilégie la voie de l'objectif quand elle existe", () => {
    expect(choisirVoie(["EMPLOI", "AUTO_EMPLOI"], "PROPRE_ACTIVITE")).toBe("AUTO_EMPLOI");
    expect(choisirVoie(["EMPLOI", "FORMATION_CERTIFICATION"], "PROPRE_ACTIVITE")).toBe("EMPLOI");
  });

  it("donne un bonus aux métiers qui offrent la voie de l'objectif", () => {
    const a = metier("a", [["c", 1]], ["EMPLOI"]);
    const b = metier("b", [["c", 1]], ["AUTO_EMPLOI"]);
    expect(preselectionner([a, b], ["c"], "PROPRE_ACTIVITE")[0]?.metier.id).toBe("b");
  });

  it("est déterministe", () => {
    const x = preselectionner(METIERS_TEST, ["vente", "couture"], "EMPLOI");
    const y = preselectionner([...METIERS_TEST].reverse(), ["couture", "vente"], "EMPLOI");
    expect(x.map((c) => c.metier.id)).toEqual(y.map((c) => c.metier.id));
  });
});

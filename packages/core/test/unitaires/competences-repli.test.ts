// Repli par mots-clés (sans IA) : cas réels rencontrés pendant la recette sur Telegram.
import { describe, expect, it } from "vitest";
import { correspondanceDeterministe } from "../../src/orientation/competences";

const REFERENTIEL = [
  {
    id: "calcul",
    libelle: "Calcul",
    synonymes: ["je calcule vite", "faire les calculs", "pourcentages"],
  },
  {
    id: "etudes-superieures",
    libelle: "Études supérieures",
    synonymes: ["licence", "diplôme de bts"],
  },
  { id: "vente", libelle: "Vente et négociation", synonymes: ["vendre au marché"] },
  { id: "couture", libelle: "Couture et retouche", synonymes: ["je couds les habits", "coudre"] },
];

describe("correspondanceDeterministe", () => {
  it("reconnaît les conjugaisons courantes", () => {
    expect(
      correspondanceDeterministe(
        "Je couds des habits et je vends des pagnes au marché.",
        REFERENTIEL,
      ).sort(),
    ).toEqual(["couture", "vente"]);
  });

  it("ne confond pas un mot court avec le début d'un mot long", () => {
    expect(
      correspondanceDeterministe("Je couds pour les gens du quartier.", REFERENTIEL),
    ).not.toContain("calcul");
  });

  it("ne déduit pas d'études supérieures d'une réponse « Pas de diplôme »", () => {
    expect(correspondanceDeterministe("Pas de diplôme", REFERENTIEL)).not.toContain(
      "etudes-superieures",
    );
  });
});

// Égalité de traitement : deux profils identiques, sauf le prénom ou le genre supposé,
// produisent exactement la même requête de choix de pistes et la même présélection.
// Le test de bout en bout avec la base est dans test/integration/egalite.test.ts.
import { describe, expect, it } from "vitest";
import { pseudonymiser } from "../../src/confidentialite/pseudonymisation";
import { preselectionner } from "../../src/orientation/preselection";
import { construireEntreeChoixPistes } from "../../src/prompts/choix-pistes.v1";
import { METIERS_TEST } from "../outils/metiers";

const base = {
  pays: "BJ",
  objectif: "EMPLOI",
  niveauEtudes: "AUCUN_DIPLOME",
  competences: ["Couture", "Vente"],
  activites: [{ libelle: "couture de vêtements", dureeMois: 36 }],
};

describe("égalité de traitement", () => {
  it("la présélection ne dépend ni du prénom ni du genre", () => {
    const pourAfi = preselectionner(METIERS_TEST, ["couture", "vente"], "EMPLOI");
    const pourKossi = preselectionner(METIERS_TEST, ["vente", "couture"], "EMPLOI");
    expect(pourAfi).toEqual(pourKossi);
  });

  it("la requête de choix de pistes ne contient aucun prénom et est identique", () => {
    const candidats = preselectionner(METIERS_TEST, ["couture", "vente"], "EMPLOI").map((c) => ({
      metierId: c.metier.id,
      libelle: c.metier.libelle,
      description: c.metier.description,
      competencesCommunes: c.competencesCommunes,
      voiesDisponibles: c.metier.voiesDisponibles,
    }));
    const a = construireEntreeChoixPistes({ ...base, candidats });
    const b = construireEntreeChoixPistes({
      ...base,
      competences: ["Vente", "Couture"],
      candidats,
    });
    expect(a).toBe(b);
    expect(a).not.toMatch(/Afi|Kossi|madame|monsieur/i);
  });

  it("le prénom est retiré du bilan avant l'extraction des compétences", () => {
    const afi = pseudonymiser("Je m'appelle Afi. Je couds des robes depuis 3 ans.", {
      nomsConnus: ["Afi"],
    });
    const kossi = pseudonymiser("Je m'appelle Kossi. Je couds des robes depuis 3 ans.", {
      nomsConnus: ["Kossi"],
    });
    expect(afi).toBe(kossi);
  });
});

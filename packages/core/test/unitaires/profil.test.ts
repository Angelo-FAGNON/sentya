// Normalisation déterministe du niveau d'études et de l'objectif.
import { describe, expect, it } from "vitest";
import { normaliserNiveauEtudes, normaliserObjectif } from "../../src/orientation/profil";

describe("normalisation du profil", () => {
  it.each([
    ["Pas de diplôme", "AUCUN_DIPLOME"],
    ["J'ai le BEPC", "SECONDAIRE"],
    ["bac D", "BAC"],
    ["Licence en gestion", "SUPERIEUR"],
    ["CQP en couture", "CERTIFICAT_PRO"],
    ["CEP", "PRIMAIRE"],
  ])("niveau : %s", (texte, attendu) => {
    expect(normaliserNiveauEtudes(texte)).toBe(attendu);
  });

  it.each([
    ["Un emploi", "EMPLOI"],
    ["Une formation", "FORMATION"],
    ["Ouvrir mon atelier à mon compte", "PROPRE_ACTIVITE"],
    ["Je ne sais pas encore", "NE_SAIT_PAS"],
    ["euh", "NE_SAIT_PAS"],
  ])("objectif : %s", (texte, attendu) => {
    expect(normaliserObjectif(texte)).toBe(attendu);
  });
});

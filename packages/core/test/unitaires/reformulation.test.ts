// Reformulation : l'IA ne peut ajouter ni nombre, ni lien, ni e-mail.
import { describe, expect, it } from "vitest";
import type { Contexte } from "../../src/contexte";
import { HorlogeSimulee } from "../../src/horloge";
import { FournisseurFactice } from "../../src/ia/factice";
import { journalSilencieux } from "../../src/journal";
import { reformulationFidele, reformuler } from "../../src/orientation/reformulation";

const SOURCE =
  "Le programme accueille les jeunes de 18 à 30 ans. Inscription sur https://sica.anpe.bj.";

const contexte = (sortie: unknown): Contexte => ({
  prisma: {} as Contexte["prisma"],
  ia: new FournisseurFactice(() => sortie),
  horloge: new HorlogeSimulee("2026-11-18T09:00:00Z"),
  journal: journalSilencieux,
  sel: "sel-de-test-suffisamment-long",
  appUrl: "https://sentya.test",
});

describe("reformulation", () => {
  it("accepte une reformulation qui garde les mêmes chiffres et liens", async () => {
    const texte = "Tu as entre 18 et 30 ans ? Inscris-toi sur https://sica.anpe.bj.";
    expect(reformulationFidele(SOURCE, texte)).toBe(true);
    expect(await reformuler(contexte({ texte }), SOURCE)).toBe(texte);
  });

  it("refuse un prix, une durée ou un contact inventés et garde le texte d'origine", async () => {
    for (const texte of [
      "Le programme coûte 5000 FCFA.",
      "La formation dure 6 mois.",
      "Écris à info@exemple.bj pour t'inscrire.",
    ]) {
      expect(reformulationFidele(SOURCE, texte), texte).toBe(false);
      expect(await reformuler(contexte({ texte }), SOURCE)).toBe(SOURCE);
    }
  });
});

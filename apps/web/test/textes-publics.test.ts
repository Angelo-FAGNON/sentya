// Pages publiques : phrases de 15 mots maximum, aucune promesse de résultat.
import { compterMots, decouperPhrases } from "@sentya/core";
import { describe, expect, it } from "vitest";
import {
  accueil,
  conditions,
  confidentialite,
  conversationExemple,
  monPlan,
  PROMESSE,
  suppression,
} from "@/lib/textes-publics";

function tousLesTextes(): string[] {
  const textes: string[] = [];
  const parcourir = (valeur: unknown) => {
    if (typeof valeur === "string") textes.push(valeur);
    else if (Array.isArray(valeur)) valeur.forEach(parcourir);
    else if (valeur && typeof valeur === "object") Object.values(valeur).forEach(parcourir);
  };
  parcourir([accueil, conversationExemple, conditions, confidentialite, suppression, monPlan]);
  return textes;
}

describe("textes des pages publiques", () => {
  it("chaque phrase fait 15 mots au maximum", () => {
    const tropLongues = tousLesTextes()
      .flatMap((t) => decouperPhrases(t))
      .filter((phrase) => compterMots(phrase) > 15);
    expect(tropLongues).toEqual([]);
  });

  it("WhatsApp n'est jamais présenté comme déjà disponible", () => {
    const mentions = tousLesTextes().filter((t) => t.includes("WhatsApp"));
    expect(mentions.length).toBeGreaterThan(0);
    for (const texte of mentions) expect(texte).toMatch(/[Bb]ientôt|arrive bientôt/);
  });

  it("la promesse imposée est reprise mot pour mot", () => {
    expect(PROMESSE).toContain("En moins de 15 minutes");
    expect(PROMESSE).toContain("un plan en 3 étapes vérifiées");
  });

  it("le lien expiré donne la consigne attendue", () => {
    expect(monPlan.expire).toBe(
      "Ce lien a déjà servi ou a expiré. Tape /monplan dans Telegram pour en recevoir un nouveau.",
    );
  });

  it("les pages légales couvrent les points exigés", () => {
    const confid = JSON.stringify(confidentialite);
    for (const mot of ["accord", "Gemini", "/supprimer", "12 mois", "sensibles", "partenaire"]) {
      expect(confid).toContain(mot);
    }
    const cond = JSON.stringify(conditions);
    for (const mot of ["suggestions", "décision", "gratuit", "18 ans", "ne promet"]) {
      expect(cond).toContain(mot);
    }
    const supp = JSON.stringify(suppression);
    for (const mot of ["/supprimer", "deuxième", "tout de suite"]) {
      expect(supp).toContain(mot);
    }
  });
});

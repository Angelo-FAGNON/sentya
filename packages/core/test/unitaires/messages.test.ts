// Interface conversationnelle : phrases de 15 mots maximum, 3 boutons maximum,
// aucun caractère interdit, aucune promesse (RG-09), aucun paiement demandé (RG-10).
import { describe, expect, it } from "vitest";
import { verifierBoutons } from "../../src/canal/canal";
import { fr } from "../../src/messages/fr";
import { QUESTIONS_BILAN } from "../../src/orientation/bilan";
import { compterMots, decouperPhrases } from "../../src/texte";

/** Exemples d'arguments pour chaque message paramétré. */
const EXEMPLES: Record<string, unknown[]> = {
  consentement: ["https://sentya.example/confidentialite"],
  voirPiste: [1],
  recapCompetences: [["Couture", "Vente au détail"]],
  raisonRepli: [["couture", "vente"]],
  conditionRepli: ["Inscris-toi sur la plateforme Azôli"],
  piste: [
    {
      rang: 1,
      libelle: "Couturier",
      voie: "Emploi",
      raison: "Tu couds depuis 3 ans.",
      condition: "Trouver un atelier.",
      source: "Source : anpe.bj, à vérifier",
      aExplorer: true,
    },
  ],
  ficheTitre: ["Couturier", "Emploi"],
  ficheOuExiste: ["Cotonou et Porto-Novo"],
  ficheDuree: ["6 mois"],
  ficheCout: ["À vérifier par le curateur"],
  source: ["anpe.bj", "à vérifier"],
  verifieeLe: ["01/11/2026"],
  etape: [
    {
      ordre: 1,
      titre: "Va à l'atelier",
      details: "Présente-toi.",
      echeance: "01/12/2026",
      source: "Source : anpe.bj",
    },
  ],
  conclusionPlan: ["Va à l'atelier"],
  rappel: [7],
  rappelEtape: [1, "Va à l'atelier", "À faire"],
  opportunite: [
    {
      titre: "Apprenti couturier",
      lieu: "Cotonou",
      contact: "À vérifier",
      verifieeLe: "01/11/2026",
    },
  ],
  consentementCandidature: ["Atelier Exemple"],
  parametres: [true],
};

/** Collecte tous les textes du fichier de messages. */
function tousLesTextes(): string[] {
  const textes: string[] = [];
  const parcourir = (valeur: unknown, cle: string) => {
    if (typeof valeur === "string") textes.push(valeur);
    else if (Array.isArray(valeur)) valeur.forEach((v) => parcourir(v, cle));
    else if (typeof valeur === "function") {
      const args = EXEMPLES[cle];
      if (!args) throw new Error(`Exemple manquant pour le message ${cle}`);
      parcourir((valeur as (...a: unknown[]) => unknown)(...args), cle);
    } else if (valeur && typeof valeur === "object") {
      for (const [k, v] of Object.entries(valeur)) parcourir(v, k);
    }
  };
  parcourir(fr, "fr");
  return textes;
}

describe("messages du bot", () => {
  const textes = tousLesTextes();

  it("contient bien des textes", () => {
    expect(textes.length).toBeGreaterThan(80);
  });

  it("n'a aucune phrase de plus de 15 mots", () => {
    const tropLongues = textes
      .flatMap((t) => decouperPhrases(t))
      .filter((p) => !p.startsWith("http") && compterMots(p) > 15);
    expect(tropLongues).toEqual([]);
  });

  it("ne promet jamais de résultat (RG-09)", () => {
    expect(textes.filter((t) => /garanti|assuré|promis|à coup sûr/i.test(t))).toEqual([]);
  });

  it("rappelle que la décision appartient au jeune (RG-09)", () => {
    expect(fr.introPistes).toMatch(/c'est toi qui décides/);
    expect(fr.ficheConclusion).toMatch(/décision t'appartient/);
  });

  it("annonce la gratuité et ne demande jamais de paiement (RG-10)", () => {
    expect(fr.accueil.join(" ")).toMatch(/gratuit/);
    const paiement = textes.filter((t) => /payer|paiement|mobile money|frais/i.test(t));
    expect(paiement).toEqual([]);
  });

  it("propose au plus 3 boutons par question du bilan", () => {
    for (const q of QUESTIONS_BILAN) expect(() => verifierBoutons(q.boutons)).not.toThrow();
    expect(() =>
      verifierBoutons(Array.from({ length: 4 }, (_, i) => ({ libelle: "x", action: `a${i}` }))),
    ).toThrow();
  });

  it("ne pose qu'une seule question par message de question", () => {
    for (const q of QUESTIONS_BILAN)
      expect((q.texte.match(/\?/g) ?? []).length).toBeLessThanOrEqual(2);
  });
});

// EF-10 et RG-05 : analyse du texte d'une offre par les règles configurables.
import { describe, expect, it } from "vitest";
import { analyserTexteOffre } from "../../src/regles/fraude";

const regle = (
  id: string,
  motif: string,
  typeMotif: "MOT_CLE" | "REGEX",
  categorie: "FRAIS_CANDIDAT" | "WHATSAPP_SEUL" | "SALAIRE_IRREALISTE" | "PAIEMENT_ENTRETIEN",
  bloquante: boolean,
  actif = true,
) => ({
  id,
  motif,
  typeMotif,
  categorie,
  description: id,
  bloquante,
  actif,
});

const REGLES = [
  regle("frais", "frais de dossier", "MOT_CLE", "FRAIS_CANDIDAT", true),
  regle("entretien", "payer l'entretien", "MOT_CLE", "PAIEMENT_ENTRETIEN", true),
  regle("whatsapp", "uniquement (par|sur) whatsapp", "REGEX", "WHATSAPP_SEUL", false),
  regle(
    "salaire",
    "\\d{3} ?000 ?(f|fcfa)? par (jour|semaine)",
    "REGEX",
    "SALAIRE_IRREALISTE",
    false,
  ),
  regle("inactive", "urgent", "MOT_CLE", "FRAIS_CANDIDAT", true, false),
  regle("invalide", "([", "REGEX", "FRAIS_CANDIDAT", true),
];

describe("analyserTexteOffre", () => {
  it("bloque une offre qui demande des frais au candidat (RG-05)", () => {
    const r = analyserTexteOffre("Recrutement vendeurs. Frais de DOSSIER : 5000 F.", REGLES);
    expect(r).toMatchObject({ alerte: true, bloquante: true });
  });

  it("alerte sans bloquer pour un contact WhatsApp seul ou un salaire irréaliste", () => {
    const r = analyserTexteOffre(
      "Gagnez 200 000 FCFA par semaine ! Contact uniquement par WhatsApp.",
      REGLES,
    );
    expect(r.bloquante).toBe(false);
    expect(r.motifs.map((m) => m.categorie).sort()).toEqual([
      "SALAIRE_IRREALISTE",
      "WHATSAPP_SEUL",
    ]);
  });

  it("ignore les règles inactives et les expressions invalides", () => {
    expect(analyserTexteOffre("Poste urgent à pourvoir", REGLES).alerte).toBe(false);
  });

  it("ne déclenche rien sur une offre saine", () => {
    expect(analyserTexteOffre("Atelier de couture recrute un apprenti à Cotonou.", REGLES)).toEqual(
      {
        alerte: false,
        bloquante: false,
        motifs: [],
      },
    );
  });
});

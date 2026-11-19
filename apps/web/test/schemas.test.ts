// Schémas des formulaires : source obligatoire, règles de fraude, comptes, dates.
import { describe, expect, it } from "vitest";
import { statutEtVerification, versChampDate } from "@/lib/fiche";
import {
  erreursParChamp,
  lireFormulaire,
  schemaCompetence,
  schemaInscriptionPartenaire,
  schemaNoteRevue,
  schemaOpportunitePartenaire,
  schemaProgramme,
  schemaRegleFraude,
  urlSource,
} from "@/lib/schemas";

const programmeValide = {
  nom: "Azôli",
  description: "Programme d'insertion.",
  publicCible: "Jeunes peu qualifiés",
  conditions: "Avoir 18 ans.",
  contact: "Agence locale",
  voies: ["EMPLOI"],
  pays: "BJ",
  sourceUrl: "https://sica.anpe.bj/azoli",
  verifieLe: "",
  statut: "A_VERIFIER",
};

describe("URL de source (RG-04)", () => {
  it("est obligatoire", () => {
    const r = urlSource.safeParse("   ");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe("La source est obligatoire.");
    expect(schemaProgramme.safeParse({ ...programmeValide, sourceUrl: undefined }).success).toBe(
      false,
    );
  });

  it("accepte seulement http et https, avec un nom de domaine", () => {
    expect(urlSource.safeParse("https://sica.anpe.bj").success).toBe(true);
    expect(urlSource.safeParse("http://exemple.tg/page").success).toBe(true);
    for (const mauvaise of [
      "sica.anpe.bj",
      "ftp://exemple.bj",
      "javascript:alert(1)",
      "https://localhost",
      "pas une url",
    ]) {
      expect(urlSource.safeParse(mauvaise).success, mauvaise).toBe(false);
    }
  });
});

describe("programme", () => {
  it("accepte une saisie complète et convertit la date", () => {
    const r = schemaProgramme.safeParse({ ...programmeValide, verifieLe: "2026-11-02" });
    expect(r.success).toBe(true);
    expect(versChampDate(r.data!.verifieLe)).toBe("2026-11-02");
  });

  it("exige au moins une voie et refuse une date impossible", () => {
    const r = schemaProgramme.safeParse({ ...programmeValide, voies: [], verifieLe: "2026-02-30" });
    expect(r.success).toBe(false);
    const erreurs = erreursParChamp(r.error!);
    expect(erreurs.voies).toBe("Coche au moins une voie.");
    expect(erreurs.verifieLe).toBe("Cette date n'existe pas.");
  });

  it("lit les cases multiples d'un FormData", () => {
    const fd = new FormData();
    fd.append("voies", "EMPLOI");
    fd.append("voies", "AUTO_EMPLOI");
    fd.append("$ACTION_KEY", "ignore");
    fd.append("nom", "Azôli");
    expect(lireFormulaire(fd, ["voies"])).toEqual({
      voies: ["EMPLOI", "AUTO_EMPLOI"],
      nom: "Azôli",
    });
    expect(lireFormulaire(new FormData(), ["voies"])).toEqual({ voies: [] });
  });
});

describe("statut et date de vérification", () => {
  const maintenant = new Date("2026-11-18T10:00:00Z");

  it("la case « vérifiée aujourd'hui » passe la fiche en VERIFIEE à la date du jour", () => {
    expect(
      statutEtVerification(
        { statut: "A_VERIFIER", verifieLe: null, verifieeAujourdhui: true },
        maintenant,
      ),
    ).toEqual({ statut: "VERIFIEE", verifieLe: maintenant });
  });

  it("une fiche VERIFIEE a toujours une date", () => {
    expect(
      statutEtVerification(
        { statut: "VERIFIEE", verifieLe: null, verifieeAujourdhui: false },
        maintenant,
      ).verifieLe,
    ).toEqual(maintenant);
  });

  it("garde la saisie sinon", () => {
    const date = new Date("2026-01-01T11:00:00Z");
    expect(
      statutEtVerification(
        { statut: "SUSPENDUE", verifieLe: date, verifieeAujourdhui: false },
        maintenant,
      ),
    ).toEqual({ statut: "SUSPENDUE", verifieLe: date });
  });
});

describe("règle de fraude", () => {
  const base = {
    typeMotif: "REGEX",
    categorie: "FRAIS_CANDIDAT",
    description: "Frais demandés",
    bloquante: "on",
    actif: "on",
  };

  it("accepte une expression régulière qui compile", () => {
    const r = schemaRegleFraude.safeParse({ ...base, motif: "frais (de )?dossier" });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ bloquante: true, actif: true });
  });

  it("refuse une expression régulière invalide, avec un message sur le champ motif", () => {
    const r = schemaRegleFraude.safeParse({ ...base, motif: "frais (de dossier" });
    expect(r.success).toBe(false);
    expect(erreursParChamp(r.error!).motif).toContain("expression régulière est invalide");
  });

  it("valide avec les mêmes drapeaux que le noyau (Unicode)", () => {
    // Valide sans le drapeau u, invalide avec : le noyau l'ignorerait, on la refuse.
    expect(schemaRegleFraude.safeParse({ ...base, motif: "\\-" }).success).toBe(false);
  });

  it("n'exige pas qu'un mot-clé soit une expression régulière", () => {
    const r = schemaRegleFraude.safeParse({
      ...base,
      typeMotif: "MOT_CLE",
      motif: "frais (dossier",
    });
    expect(r.success).toBe(true);
    expect(r.data?.bloquante).toBe(true);
  });

  it("case décochée : faux", () => {
    const r = schemaRegleFraude.safeParse({
      ...base,
      motif: "x",
      bloquante: undefined,
      actif: undefined,
    });
    expect(r.data).toMatchObject({ bloquante: false, actif: false });
  });
});

describe("compétence", () => {
  it("découpe les synonymes et refuse un identifiant avec accents ou majuscules", () => {
    const r = schemaCompetence.safeParse({
      id: "couture-retouche",
      libelle: "Couture",
      synonymes: " coudre, retoucher ,, coudre ",
      domaine: "artisanat",
    });
    expect(r.data?.synonymes).toEqual(["coudre", "retoucher"]);
    expect(schemaCompetence.safeParse({ id: "Écriture", libelle: "x", domaine: "y" }).success).toBe(
      false,
    );
  });
});

describe("inscription partenaire", () => {
  const saisie = {
    type: "EMPLOYEUR",
    nom: "Atelier",
    pays: "TG",
    contactOfficiel: "+228 90 00 00 00",
    email: "Contact@Atelier.TEST",
    motDePasse: "unmotdepasse-long",
    confirmation: "unmotdepasse-long",
  };

  it("normalise l'e-mail en minuscules", () => {
    expect(schemaInscriptionPartenaire.parse(saisie).email).toBe("contact@atelier.test");
  });

  it("exige 12 caractères et deux mots de passe identiques", () => {
    const court = schemaInscriptionPartenaire.safeParse({
      ...saisie,
      motDePasse: "court",
      confirmation: "court",
    });
    expect(erreursParChamp(court.error!).motDePasse).toBe("12 caractères au minimum.");
    const different = schemaInscriptionPartenaire.safeParse({
      ...saisie,
      confirmation: "autre-mot-de-passe",
    });
    expect(erreursParChamp(different.error!).confirmation).toContain("pas identiques");
  });
});

describe("opportunité d'un partenaire", () => {
  it("ne contient ni pays ni partenaire : ils viennent de la session", () => {
    const r = schemaOpportunitePartenaire.parse({
      titre: "Apprenti",
      description: "Atelier",
      lieu: "Lomé",
      contact: "contact@atelier.test",
      sourceUrl: "https://atelier.test/offre",
      metierId: "",
      dateLimite: "",
      pays: "BJ",
      partenaireId: "autre",
    });
    expect(r).not.toHaveProperty("pays");
    expect(r).not.toHaveProperty("partenaireId");
    expect(r.metierId).toBeNull();
    expect(r.dateLimite).toBeNull();
  });
});

describe("notation de la revue qualité", () => {
  it("exige oui ou non pour les deux questions", () => {
    expect(schemaNoteRevue.parse({ pistesCorrectes: "oui", inventionDetectee: "non" })).toEqual({
      pistesCorrectes: true,
      inventionDetectee: false,
      commentaire: null,
    });
    expect(schemaNoteRevue.safeParse({ pistesCorrectes: "peut-etre" }).success).toBe(false);
  });
});

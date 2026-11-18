// EF-08 et RG-04 : calcul des dates de rappel, péremption et affichage des sources.
import { describe, expect, it } from "vitest";
import { composantesLocales, dateLocale, formaterDate, semaineIso } from "../../src/dates";
import { HorlogeSimulee } from "../../src/horloge";
import { estPerimee } from "../../src/regles/peremption";
import { ajusterPlageHoraire, calculerRappels } from "../../src/regles/rappels";
import { formaterCout, mentionSource } from "../../src/regles/sources";

describe("rappels J+3, J+7, J+30", () => {
  it("planifie les trois rappels aux bons jours", () => {
    const creation = dateLocale(2026, 11, 18, 10, 30);
    const rappels = calculerRappels(creation);
    expect(rappels.map((r) => r.type)).toEqual(["J3", "J7", "J30"]);
    expect(rappels.map((r) => formaterDate(r.prevuLe))).toEqual([
      "21/11/2026",
      "25/11/2026",
      "18/12/2026",
    ]);
  });

  it("décale un rappel de nuit au matin suivant (8 h, heure de Cotonou)", () => {
    const soir = ajusterPlageHoraire(dateLocale(2026, 11, 18, 22, 15));
    expect(composantesLocales(soir)).toMatchObject({ jour: 19, heure: 8, minute: 0 });
    const aube = ajusterPlageHoraire(dateLocale(2026, 11, 18, 5, 0));
    expect(composantesLocales(aube)).toMatchObject({ jour: 18, heure: 8 });
  });

  it("l'horloge simulée avance comme prévu", () => {
    const horloge = new HorlogeSimulee("2026-11-18T09:00:00Z");
    horloge.avancerJours(3);
    expect(horloge.maintenant().toISOString()).toBe("2026-11-21T09:00:00.000Z");
  });
});

describe("RG-04 sources, dates et péremption", () => {
  const maintenant = new Date("2026-11-18T12:00:00Z");

  it("une fiche vérifiée il y a plus de 6 mois est périmée", () => {
    expect(estPerimee({ statut: "VERIFIEE", verifieLe: new Date("2026-05-01") }, maintenant)).toBe(
      true,
    );
    expect(estPerimee({ statut: "VERIFIEE", verifieLe: new Date("2026-06-01") }, maintenant)).toBe(
      false,
    );
    expect(estPerimee({ statut: "A_VERIFIER", verifieLe: null }, maintenant)).toBe(false);
  });

  it("affiche la source et la date de vérification", () => {
    expect(
      mentionSource({
        sourceUrl: "https://www.sica.anpe.bj/x",
        verifieLe: new Date("2026-03-12T10:00:00Z"),
        statut: "VERIFIEE",
      }),
    ).toBe("Source : sica.anpe.bj, vérifiée le 12/03/2026");
    expect(
      mentionSource({ sourceUrl: "https://anpe.tg", verifieLe: null, statut: "A_VERIFIER" }),
    ).toBe("Source : anpe.tg, à vérifier");
  });

  it("affiche un coût inconnu avec la mention imposée", () => {
    expect(formaterCout(null)).toBe("À vérifier par le curateur");
    expect(formaterCout(150000)).toBe("150 000 FCFA");
  });

  it("calcule la semaine ISO", () => {
    expect(semaineIso(new Date("2026-11-18T12:00:00Z"))).toBe("2026-W47");
  });
});

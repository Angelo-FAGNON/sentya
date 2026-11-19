// Limitation des échecs de connexion : 5 échecs par 15 minutes par (IP, e-mail).
import { describe, expect, it } from "vitest";
import { ECHECS_MAX, FENETRE_MS, LimiteurEchecs } from "@/lib/limiteur";

function limiteurAvecHorloge() {
  let maintenant = Date.UTC(2026, 10, 18, 10);
  const limiteur = new LimiteurEchecs(ECHECS_MAX, FENETRE_MS, () => maintenant);
  return { limiteur, avancer: (ms: number) => (maintenant += ms) };
}

describe("limiteur de connexion", () => {
  it("bloque après 5 échecs, pas avant", () => {
    const { limiteur } = limiteurAvecHorloge();
    const cle = LimiteurEchecs.cle("1.2.3.4", "admin@sentya.test");
    for (let i = 0; i < 4; i += 1) limiteur.enregistrerEchec(cle);
    expect(limiteur.estBloque(cle)).toBe(false);
    limiteur.enregistrerEchec(cle);
    expect(limiteur.estBloque(cle)).toBe(true);
  });

  it("débloque quand les échecs sortent de la fenêtre de 15 minutes", () => {
    const { limiteur, avancer } = limiteurAvecHorloge();
    const cle = LimiteurEchecs.cle("1.2.3.4", "a@b.test");
    for (let i = 0; i < 5; i += 1) limiteur.enregistrerEchec(cle);
    avancer(FENETRE_MS - 1000);
    expect(limiteur.estBloque(cle)).toBe(true);
    avancer(2000);
    expect(limiteur.estBloque(cle)).toBe(false);
  });

  it("fenêtre glissante : seuls les échecs récents comptent", () => {
    const { limiteur, avancer } = limiteurAvecHorloge();
    const cle = LimiteurEchecs.cle("1.2.3.4", "a@b.test");
    for (let i = 0; i < 3; i += 1) limiteur.enregistrerEchec(cle);
    avancer(10 * 60_000);
    limiteur.enregistrerEchec(cle);
    limiteur.enregistrerEchec(cle);
    expect(limiteur.estBloque(cle)).toBe(true);
    avancer(6 * 60_000);
    expect(limiteur.estBloque(cle)).toBe(false);
  });

  it("isole chaque couple IP et e-mail, sans tenir compte de la casse de l'e-mail", () => {
    const { limiteur } = limiteurAvecHorloge();
    const cle = LimiteurEchecs.cle("1.2.3.4", "Admin@Sentya.test ");
    for (let i = 0; i < 5; i += 1) limiteur.enregistrerEchec(cle);
    expect(limiteur.estBloque(LimiteurEchecs.cle("1.2.3.4", "admin@sentya.test"))).toBe(true);
    expect(limiteur.estBloque(LimiteurEchecs.cle("5.6.7.8", "admin@sentya.test"))).toBe(false);
    expect(limiteur.estBloque(LimiteurEchecs.cle("1.2.3.4", "autre@sentya.test"))).toBe(false);
  });

  it("une connexion réussie remet le compteur à zéro", () => {
    const { limiteur } = limiteurAvecHorloge();
    const cle = LimiteurEchecs.cle("1.2.3.4", "a@b.test");
    for (let i = 0; i < 4; i += 1) limiteur.enregistrerEchec(cle);
    limiteur.reinitialiser(cle);
    limiteur.enregistrerEchec(cle);
    expect(limiteur.estBloque(cle)).toBe(false);
  });
});

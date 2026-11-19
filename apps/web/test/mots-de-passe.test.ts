// L'administrateur créé par le seed (argon2id, paramètres par défaut) peut se connecter :
// la vérification du site accepte ce hachage.
import argon2 from "argon2";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { hacherMotDePasse, verifierMotDePasse } = await import("../src/lib/mots-de-passe");

describe("mots de passe", () => {
  it("accepte un hachage produit comme dans le seed", async () => {
    const hachageSeed = await argon2.hash("mot-de-passe-de-test-123", { type: argon2.argon2id });
    expect(await verifierMotDePasse(hachageSeed, "mot-de-passe-de-test-123")).toBe(true);
    expect(await verifierMotDePasse(hachageSeed, "mauvais-mot-de-passe")).toBe(false);
  });

  it("refuse un compte inconnu même avec le mot de passe factice", async () => {
    expect(await verifierMotDePasse(null, "sentya-compte-inexistant")).toBe(false);
  });

  it("vérifie ses propres hachages", async () => {
    const h = await hacherMotDePasse("autre-mot-de-passe-long");
    expect(await verifierMotDePasse(h, "autre-mot-de-passe-long")).toBe(true);
  });
});

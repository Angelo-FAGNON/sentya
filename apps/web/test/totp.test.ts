// Vérification des codes TOTP (RFC 6238 : SHA-1, 6 chiffres, 30 secondes).
import { describe, expect, it } from "vitest";
import { codeTotp, nouveauSecretTotp, uriTotp, verifierCodeTotp } from "@/lib/totp";

const INSTANT = new Date("2026-11-18T10:00:15Z");

describe("TOTP", () => {
  it("génère un secret base32 d'au moins 16 octets", () => {
    const secret = nouveauSecretTotp();
    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(Math.floor((secret.replace(/=+$/, "").length * 5) / 8)).toBeGreaterThanOrEqual(16);
  });

  it("accepte le code du moment", async () => {
    const secret = nouveauSecretTotp();
    const code = await codeTotp(secret, INSTANT);
    expect(code).toMatch(/^\d{6}$/);
    expect(await verifierCodeTotp(secret, code, INSTANT)).toBe(true);
  });

  it("accepte un code saisi avec des espaces", async () => {
    const secret = nouveauSecretTotp();
    const code = await codeTotp(secret, INSTANT);
    expect(await verifierCodeTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, INSTANT)).toBe(
      true,
    );
  });

  it("tolère une période de décalage, pas davantage", async () => {
    const secret = nouveauSecretTotp();
    const code = await codeTotp(secret, INSTANT);
    expect(await verifierCodeTotp(secret, code, new Date(INSTANT.getTime() + 30_000))).toBe(true);
    expect(await verifierCodeTotp(secret, code, new Date(INSTANT.getTime() + 5 * 60_000))).toBe(
      false,
    );
  });

  it("refuse un mauvais code, un code d'un autre secret et une saisie mal formée", async () => {
    const secret = nouveauSecretTotp();
    const code = await codeTotp(secret, INSTANT);
    const faux = String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    expect(await verifierCodeTotp(secret, faux, INSTANT)).toBe(false);
    expect(await verifierCodeTotp(nouveauSecretTotp(), code, INSTANT)).toBe(false);
    for (const saisie of ["", "12345", "1234567", "abcdef", "12345a"]) {
      expect(await verifierCodeTotp(secret, saisie, INSTANT)).toBe(false);
    }
  });

  it("correspond au vecteur de référence de la RFC 6238 (SHA-1, 6 chiffres)", async () => {
    // Clé ASCII "12345678901234567890" en base32. À T = 59 s, le code à 8 chiffres est 94287082.
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(await codeTotp(secret, new Date(59_000))).toBe("287082");
  });

  it("construit l'URI otpauth pour les applications d'authentification", () => {
    const uri = uriTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "admin@sentya.test");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain("issuer=Sentya");
    expect(uri).toContain("secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });
});

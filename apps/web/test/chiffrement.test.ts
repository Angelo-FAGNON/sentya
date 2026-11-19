// Chiffrement du secret TOTP : AES-256-GCM, clé dérivée de AUTH_SECRET.
import { describe, expect, it } from "vitest";
import { chiffrer, dechiffrer, deriverCle } from "@/lib/chiffrement";

const SECRET_APP = "un-secret-de-test-de-plus-de-32-caracteres";
const SECRET_TOTP = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

describe("chiffrement du secret TOTP", () => {
  it("retrouve le texte clair après un aller-retour", () => {
    const chiffre = chiffrer(SECRET_TOTP, SECRET_APP);
    expect(dechiffrer(chiffre, SECRET_APP)).toBe(SECRET_TOTP);
  });

  it("ne stocke jamais le secret en clair et change de vecteur à chaque chiffrement", () => {
    const a = chiffrer(SECRET_TOTP, SECRET_APP);
    const b = chiffrer(SECRET_TOTP, SECRET_APP);
    expect(a).not.toContain(SECRET_TOTP);
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.")).toBe(true);
  });

  it("refuse une donnée modifiée (authentification GCM)", () => {
    const [version, iv, etiquette, chiffre] = chiffrer(SECRET_TOTP, SECRET_APP).split(".");
    const octets = Buffer.from(chiffre!, "base64url");
    octets[0] = octets[0]! ^ 0xff;
    const altere = [version, iv, etiquette, octets.toString("base64url")].join(".");
    expect(() => dechiffrer(altere, SECRET_APP)).toThrow();
  });

  it("refuse le déchiffrement avec un autre AUTH_SECRET", () => {
    const chiffre = chiffrer(SECRET_TOTP, SECRET_APP);
    expect(() => dechiffrer(chiffre, "un-autre-secret-de-plus-de-32-caracteres")).toThrow();
  });

  it("refuse un format inconnu", () => {
    expect(() => dechiffrer("pas-chiffre", SECRET_APP)).toThrow("Format");
  });

  it("dérive une clé de 32 octets, stable pour un même secret", () => {
    const cle = deriverCle(SECRET_APP);
    expect(cle).toHaveLength(32);
    expect(deriverCle(SECRET_APP).equals(cle)).toBe(true);
    expect(deriverCle(`${SECRET_APP}x`).equals(cle)).toBe(false);
  });
});

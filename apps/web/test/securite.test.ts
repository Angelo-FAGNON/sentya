// En-têtes de sécurité, contrôle d'origine, adresse IP et configuration.
import { describe, expect, it } from "vitest";
import { validerEnv } from "@/env";
import { construireCsp } from "@/lib/csp";
import { ipDepuisEntetes } from "@/lib/ip";
import { origineAutorisee } from "@/lib/origine";
import { lireSessionBrute } from "@/lib/session";
import { lienTelegram } from "@/lib/telegram";

describe("CSP", () => {
  it("n'autorise jamais 'unsafe-eval' en production et interdit l'affichage en cadre", () => {
    const csp = construireCsp("abc", { developpement: false, https: true });
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });
});

describe("origine des requêtes POST", () => {
  const requete = (origine?: string) =>
    new Request("https://sentya.test/api/auth/callback/admin", {
      method: "POST",
      headers: origine ? { origin: origine } : {},
    });

  it("accepte la même origine que APP_URL", () => {
    expect(origineAutorisee(requete("https://sentya.test"), "https://sentya.test/")).toBe(true);
  });

  it("refuse une autre origine ou une origine absente", () => {
    expect(origineAutorisee(requete("https://pirate.test"), "https://sentya.test")).toBe(false);
    expect(origineAutorisee(requete("http://sentya.test"), "https://sentya.test")).toBe(false);
    expect(origineAutorisee(requete(), "https://sentya.test")).toBe(false);
    expect(origineAutorisee(requete("null"), "https://sentya.test")).toBe(false);
  });
});

describe("adresse IP", () => {
  it("prend la première adresse transmise par le proxy inverse", () => {
    expect(ipDepuisEntetes(new Headers({ "x-forwarded-for": "41.1.2.3, 10.0.0.1" }))).toBe(
      "41.1.2.3",
    );
    expect(ipDepuisEntetes(new Headers({ "x-real-ip": "41.9.9.9" }))).toBe("41.9.9.9");
    expect(ipDepuisEntetes(new Headers())).toBe("inconnue");
  });
});

describe("variables d'environnement", () => {
  const valides = {
    DATABASE_URL: "postgresql://sentya:sentya@localhost:5432/sentya",
    AUTH_SECRET: "x".repeat(32),
    APP_URL: "https://sentya.test/",
    TELEGRAM_BOT_USERNAME: "SentyaBot",
  };

  it("valide la configuration et retire la barre finale de APP_URL", () => {
    expect(validerEnv(valides).APP_URL).toBe("https://sentya.test");
  });

  it("liste clairement chaque variable fautive", () => {
    expect(() =>
      validerEnv({ ...valides, AUTH_SECRET: "court", TELEGRAM_BOT_USERNAME: "@Sentya" }),
    ).toThrow(/AUTH_SECRET[\s\S]*TELEGRAM_BOT_USERNAME/);
    expect(() => validerEnv({})).toThrow(/DATABASE_URL/);
  });
});

describe("session et lien Telegram", () => {
  it("lit les champs Sentya du jeton, et rien si un champ manque", () => {
    expect(lireSessionBrute({ id: "a", role: "CURATEUR", totpRequis: true })).toEqual({
      id: "a",
      role: "CURATEUR",
      partenaireId: null,
      totpRequis: true,
    });
    expect(lireSessionBrute({ id: "a", role: "ROI" })).toBeNull();
    expect(lireSessionBrute(undefined)).toBeNull();
  });

  it("construit le lien profond avec la source", () => {
    expect(lienTelegram("SentyaBot", "qr")).toBe("https://t.me/SentyaBot?start=qr");
  });
});

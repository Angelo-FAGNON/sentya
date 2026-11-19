// Configuration du bot : une variable vide dans .env est ignorée, le mode webhook est contrôlé.
import { describe, expect, it } from "vitest";
import { lireConfigBot } from "../src/config";

const BASE = {
  TELEGRAM_BOT_TOKEN: "123456:JETON-FACTICE-SUFFISAMMENT-LONG",
  DATABASE_URL: "postgresql://x",
};

describe("lireConfigBot", () => {
  it("ignore les variables vides (CLE= dans .env)", () => {
    const config = lireConfigBot({
      ...BASE,
      BOT_PUBLIC_URL: "",
      TELEGRAM_WEBHOOK_SECRET: "",
      BOT_MODE: "",
    });
    expect(config).toMatchObject({ BOT_MODE: "polling", BOT_PORT: 8080 });
    expect(config.BOT_PUBLIC_URL).toBeUndefined();
  });

  it("exige une URL https et un secret en mode webhook", () => {
    expect(() => lireConfigBot({ ...BASE, BOT_MODE: "webhook" })).toThrow(
      /TELEGRAM_WEBHOOK_SECRET/,
    );
    expect(() =>
      lireConfigBot({
        ...BASE,
        BOT_MODE: "webhook",
        TELEGRAM_WEBHOOK_SECRET: "secret-de-test-0123456789",
        BOT_PUBLIC_URL: "http://x.org",
      }),
    ).toThrow(/BOT_PUBLIC_URL/);
  });
});

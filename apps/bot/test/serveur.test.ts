// Serveur HTTP du bot : /health et vérification du jeton secret du webhook.
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterAll, describe, expect, it } from "vitest";
import { journalSilencieux } from "@sentya/core";
import { creerServeur } from "../src/serveur";
import { LimiteurDebit } from "../src/middlewares/limite-debit";
import { VerrouParCle } from "../src/middlewares/verrou";
import { creerEnvironnement } from "./outils";

const env = creerEnvironnement();
afterAll(() => env.prisma.$disconnect());

async function demarrer(verifierBase: () => Promise<boolean>) {
  const serveur = creerServeur({
    journal: journalSilencieux,
    verifierBase,
    bot: env.bot,
    secretWebhook: "secret-de-test-0123456789",
  });
  serveur.listen(0);
  await once(serveur, "listening");
  const { port } = serveur.address() as AddressInfo;
  return { serveur, url: `http://127.0.0.1:${port}` };
}

describe("serveur HTTP", () => {
  it("répond sur /health selon l'état de la base", async () => {
    const ok = await demarrer(async () => true);
    expect((await fetch(`${ok.url}/health`)).status).toBe(200);
    ok.serveur.close();
    const ko = await demarrer(async () => false);
    expect((await fetch(`${ko.url}/health`)).status).toBe(503);
    ko.serveur.close();
  });

  it("refuse un webhook sans le bon jeton secret", async () => {
    const { serveur, url } = await demarrer(async () => true);
    const corps = JSON.stringify({
      update_id: 1,
      message: {
        message_id: 1,
        date: 0,
        chat: { id: 1, type: "private" },
        from: { id: 1, is_bot: false, first_name: "X" },
        text: "/start",
      },
    });
    const sansJeton = await fetch(`${url}/telegram/webhook`, {
      method: "POST",
      body: corps,
      headers: { "Content-Type": "application/json" },
    });
    expect(sansJeton.status).toBe(401);
    const mauvais = await fetch(`${url}/telegram/webhook`, {
      method: "POST",
      body: corps,
      headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": "faux" },
    });
    expect(mauvais.status).toBe(401);
    const bon = await fetch(`${url}/telegram/webhook`, {
      method: "POST",
      body: corps,
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": "secret-de-test-0123456789",
      },
    });
    expect(bon.status).toBe(200);
    serveur.close();
  });
});

describe("limitation du débit et verrou", () => {
  it("accepte 20 messages par minute, prévient une fois, puis se libère", () => {
    const limiteur = new LimiteurDebit(20, 60_000);
    for (let i = 0; i < 20; i += 1) expect(limiteur.verifier("a", 1000 + i)).toBe("ok");
    expect(limiteur.verifier("a", 2000)).toBe("refuse_prevenir");
    expect(limiteur.verifier("a", 2001)).toBe("refuse");
    expect(limiteur.verifier("b", 2001)).toBe("ok");
    expect(limiteur.verifier("a", 62_000)).toBe("ok");
  });

  it("traite les messages d'un même jeune un par un, dans l'ordre", async () => {
    const verrou = new VerrouParCle();
    const ordre: number[] = [];
    const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await Promise.all([
      verrou.executer("x", async () => {
        await attendre(30);
        ordre.push(1);
      }),
      verrou.executer("x", async () => {
        ordre.push(2);
      }),
    ]);
    expect(ordre).toEqual([1, 2]);
  });
});

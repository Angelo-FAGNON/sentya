// Canal Telegram : boutons-liens acceptés par Telegram, repli en texte pour une adresse locale.
import { describe, expect, it } from "vitest";
import type { Api } from "grammy";
import { TelegramCanal, urlAccepteeEnBouton } from "../src/telegram-canal";

function apiFactice() {
  const envois: { texte: string; options: Record<string, unknown> }[] = [];
  const api = {
    sendMessage: async (_chat: string, texte: string, options: Record<string, unknown>) => {
      envois.push({ texte, options });
      return {};
    },
  } as unknown as Api;
  return { api, envois };
}

describe("TelegramCanal", () => {
  it("reconnaît les URL refusées par Telegram en bouton", () => {
    expect(urlAccepteeEnBouton("https://sentya.example/monplan/abc")).toBe(true);
    expect(urlAccepteeEnBouton("http://localhost:3000/monplan/abc")).toBe(false);
    expect(urlAccepteeEnBouton("http://127.0.0.1:3000/x")).toBe(false);
    expect(urlAccepteeEnBouton("pas une url")).toBe(false);
  });

  it("envoie un lien public en bouton, et un lien local dans le texte", async () => {
    const { api, envois } = apiFactice();
    const canal = new TelegramCanal(api, async () => Buffer.alloc(0));
    await canal.envoyerTexte("1", "Voici ton lien.", {
      lien: { libelle: "Ouvrir", url: "https://sentya.example/p" },
    });
    await canal.envoyerTexte("1", "Voici ton lien.", {
      lien: { libelle: "Ouvrir", url: "http://localhost:3000/p" },
    });
    expect(envois[0]?.texte).toBe("Voici ton lien.");
    expect(JSON.stringify(envois[0]?.options.reply_markup)).toContain("https://sentya.example/p");
    expect(envois[1]?.texte).toBe("Voici ton lien.\nhttp://localhost:3000/p");
    expect(envois[1]?.options.reply_markup).toBeUndefined();
  });
});

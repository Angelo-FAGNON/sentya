// Serveur HTTP minimal (node:http) : /health, et le webhook Telegram en production.
// Le webhook vérifie l'en-tête X-Telegram-Bot-Api-Secret-Token (réponse 401 sinon).
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { webhookCallback, type Bot } from "grammy";
import type { Journal } from "@sentya/core";
import { CHEMIN_WEBHOOK } from "./config";

export interface OptionsServeur {
  verifierBase: () => Promise<boolean>;
  journal: Journal;
  /** Présents uniquement en mode webhook. */
  bot?: Bot;
  secretWebhook?: string;
}

function json(res: ServerResponse, statut: number, corps: unknown) {
  res.writeHead(statut, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(corps));
}

export function creerServeur(options: OptionsServeur): Server {
  const webhook =
    options.bot && options.secretWebhook
      ? webhookCallback(options.bot, "http", {
          secretToken: options.secretWebhook,
          // Réponse 200 rapide à Telegram ; le traitement continue (idempotence par update_id).
          onTimeout: "return",
          timeoutMilliseconds: 9_000,
        })
      : null;

  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const chemin = (req.url ?? "/").split("?")[0];
    try {
      if (req.method === "GET" && chemin === "/health") {
        const base = await options.verifierBase().catch(() => false);
        json(res, base ? 200 : 503, { status: base ? "ok" : "degrade", base });
        return;
      }
      if (req.method === "POST" && chemin === CHEMIN_WEBHOOK && webhook) {
        await webhook(req, res);
        return;
      }
      json(res, 404, { erreur: "introuvable" });
    } catch (erreur) {
      options.journal.error({ erreur: (erreur as Error).message }, "erreur du serveur HTTP");
      if (!res.headersSent) json(res, 500, { erreur: "interne" });
    }
  });
}

// Démarrage du bot Sentya : long polling en développement, webhook en production.
import { PgBoss } from "pg-boss";
import {
  creerJournal,
  FournisseurGemini,
  FournisseurSansIA,
  horlogeSysteme,
  lireConfig,
  type Contexte,
} from "@sentya/core";
import { getPrisma } from "@sentya/db";
import { convertirPcmEnOgg } from "./audio";
import { creerBot, declarerCommandes } from "./bot";
import { CHEMIN_WEBHOOK, lireConfigBot } from "./config";
import { generateurPdfPlan } from "./pdf/plan-pdf";
import { creerServeur } from "./serveur";
import { demarrerTaches, PlanificateurPgBoss } from "./taches/taches";
import { TelegramCanal, telechargeurTelegram } from "./telegram-canal";

async function demarrer() {
  const journal = creerJournal("bot");
  const configBot = lireConfigBot();
  const config = lireConfig();
  const prisma = getPrisma();
  if (!config.GEMINI_API_KEY) {
    journal.warn("GEMINI_API_KEY absente : mode sans IA (replis deterministes uniquement)");
  }

  const ctx: Contexte = {
    prisma,
    ia: config.GEMINI_API_KEY
      ? new FournisseurGemini({
          apiKey: config.GEMINI_API_KEY,
          modele: config.GEMINI_MODEL,
          modeleVoix: config.GEMINI_TTS_MODEL,
        })
      : new FournisseurSansIA(),
    horloge: horlogeSysteme,
    journal,
    sel: config.HASH_SALT,
    appUrl: config.APP_URL,
  };

  const boss = new PgBoss(configBot.DATABASE_URL);
  boss.on("error", (erreur) => journal.error({ erreur: erreur.message }, "erreur pg-boss"));
  await boss.start();
  const planificateur = new PlanificateurPgBoss(boss);

  const { bot, deps, verrou } = creerBot({
    jeton: configBot.TELEGRAM_BOT_TOKEN,
    prisma,
    journal,
    dependances: (b) => ({
      ctx,
      canal: new TelegramCanal(b.api, telechargeurTelegram(configBot.TELEGRAM_BOT_TOKEN)),
      planificateur,
      urlConfidentialite: `${config.APP_URL.replace(/\/$/, "")}/confidentialite`,
      genererPdfPlan: generateurPdfPlan(prisma),
      convertirVoix: convertirPcmEnOgg,
    }),
  });

  await demarrerTaches(boss, deps, verrou);
  await bot.init();
  await declarerCommandes(bot).catch((e: Error) =>
    journal.warn({ erreur: e.message }, "menu des commandes non declare"),
  );

  const webhook = configBot.BOT_MODE === "webhook";
  const serveur = creerServeur({
    journal,
    verifierBase: async () => {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    },
    bot: webhook ? bot : undefined,
    secretWebhook: webhook ? configBot.TELEGRAM_WEBHOOK_SECRET : undefined,
  });
  serveur.listen(configBot.BOT_PORT, () =>
    journal.info({ port: configBot.BOT_PORT, mode: configBot.BOT_MODE }, "serveur HTTP demarre"),
  );

  if (webhook) {
    const url = `${configBot.BOT_PUBLIC_URL?.replace(/\/$/, "")}${CHEMIN_WEBHOOK}`;
    await bot.api.setWebhook(url, {
      secret_token: configBot.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ["message", "callback_query"],
    });
    journal.info("webhook Telegram configure");
  } else {
    await bot.api.deleteWebhook();
    void bot.start({
      allowed_updates: ["message", "callback_query"],
      onStart: () => journal.info("long polling demarre"),
    });
  }

  const arreter = async (signal: string) => {
    journal.info({ signal }, "arret en cours");
    await bot.stop().catch(() => undefined);
    serveur.close();
    await boss.stop({ graceful: true, timeout: 10_000 }).catch(() => undefined);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void arreter("SIGTERM"));
  process.on("SIGINT", () => void arreter("SIGINT"));
}

demarrer().catch((erreur: Error) => {
  creerJournal("bot").fatal({ erreur: erreur.message }, "demarrage impossible");
  process.exit(1);
});

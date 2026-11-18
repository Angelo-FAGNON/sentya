// Construction du bot grammY : journal, filtrage, idempotence, limitation du débit,
// verrou par jeune, puis délégation au moteur de parcours du noyau.
import { Bot, type BotConfig, type Context } from "grammy";
import { fr, traiterMessage, type DependancesParcours, type Journal } from "@sentya/core";
import type { PrismaClient } from "@sentya/db";
import { convertirMiseAJour } from "./conversion";
import { marquerMiseAJour } from "./middlewares/idempotence";
import { LimiteurDebit } from "./middlewares/limite-debit";
import { VerrouParCle } from "./middlewares/verrou";

export interface OptionsBot {
  jeton: string;
  prisma: PrismaClient;
  journal: Journal;
  /** Fabrique des dépendances du parcours, une fois l'API du bot disponible. */
  dependances: (bot: Bot) => DependancesParcours;
  verrou?: VerrouParCle;
  limiteur?: LimiteurDebit;
  configBot?: BotConfig<Context>;
}

export interface BotSentya {
  bot: Bot;
  deps: DependancesParcours;
  verrou: VerrouParCle;
}

export function creerBot(options: OptionsBot): BotSentya {
  const bot = new Bot(options.jeton, options.configBot);
  const deps = options.dependances(bot);
  const verrou = options.verrou ?? new VerrouParCle();
  const limiteur = options.limiteur ?? new LimiteurDebit();
  const { journal } = options;

  bot.use(async (ctx, next) => {
    const debut = Date.now();
    await next();
    // Journal sans contenu ni identité : type de mise à jour et durée seulement.
    journal.info(
      {
        updateId: ctx.update.update_id,
        type: Object.keys(ctx.update).filter((k) => k !== "update_id")[0],
        dureeMs: Date.now() - debut,
      },
      "mise a jour traitee",
    );
  });

  bot.use(async (ctx, next) => {
    if (!(await marquerMiseAJour(options.prisma, ctx.update.update_id))) {
      journal.info({ updateId: ctx.update.update_id }, "mise a jour deja traitee, ignoree");
      return;
    }
    await next();
  });

  bot.on(["message", "callback_query"], async (ctx) => {
    const entree = convertirMiseAJour(ctx);
    if (ctx.callbackQuery) await ctx.answerCallbackQuery().catch(() => undefined);
    if (!entree) return;

    const decision = limiteur.verifier(entree.idCanal, Date.now());
    if (decision !== "ok") {
      if (decision === "refuse_prevenir")
        await deps.canal.envoyerTexte(entree.idCanal, fr.tropRapide);
      return;
    }

    await verrou.executer(entree.idCanal, () => traiterMessage(deps, entree));
  });

  bot.catch(async (erreur) => {
    journal.error(
      {
        erreur: erreur.error instanceof Error ? erreur.error.message : String(erreur.error),
        updateId: erreur.ctx.update.update_id,
      },
      "erreur de traitement",
    );
    const chatId = erreur.ctx.chat?.id;
    if (chatId)
      await deps.canal.envoyerTexte(String(chatId), fr.erreurTechnique).catch(() => undefined);
  });

  setInterval(() => limiteur.nettoyer(Date.now()), 5 * 60_000).unref();
  return { bot, deps, verrou };
}

/** Menu des commandes affiché par Telegram. */
export async function declarerCommandes(bot: Bot): Promise<void> {
  await bot.api.setMyCommands(
    Object.entries(fr.commandes).map(([command, description]) => ({ command, description })),
  );
}

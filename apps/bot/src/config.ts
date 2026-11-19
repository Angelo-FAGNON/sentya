// Configuration du bot, validée au démarrage. Les secrets viennent uniquement de l'environnement.
import { sansValeursVides } from "@sentya/core";
import { z } from "zod";

const schema = z
  .object({
    TELEGRAM_BOT_TOKEN: z.string().min(20, "TELEGRAM_BOT_TOKEN est manquant ou invalide."),
    TELEGRAM_WEBHOOK_SECRET: z
      .string()
      .regex(
        /^[A-Za-z0-9_-]{16,256}$/,
        "TELEGRAM_WEBHOOK_SECRET : 16 à 256 caractères A-Z a-z 0-9 _ -",
      )
      .optional(),
    BOT_MODE: z.enum(["polling", "webhook"]).default("polling"),
    /** URL publique HTTPS du bot (ex. https://bot.sentya.example), utilisée en mode webhook. */
    BOT_PUBLIC_URL: z.url().optional(),
    BOT_PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    DATABASE_URL: z.string().min(1, "DATABASE_URL est manquante."),
    APP_URL: z.url().default("http://localhost:3000"),
  })
  .superRefine((env, ctx) => {
    if (env.BOT_MODE === "webhook") {
      if (!env.TELEGRAM_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["TELEGRAM_WEBHOOK_SECRET"],
          message: "obligatoire en mode webhook",
        });
      }
      if (!env.BOT_PUBLIC_URL?.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          path: ["BOT_PUBLIC_URL"],
          message: "URL https obligatoire en mode webhook",
        });
      }
    }
  });

export type ConfigBot = z.infer<typeof schema>;

export function lireConfigBot(env: NodeJS.ProcessEnv = process.env): ConfigBot {
  const resultat = schema.safeParse(sansValeursVides(env));
  if (!resultat.success) {
    const details = resultat.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`);
    throw new Error(`Configuration du bot invalide.\n${details.join("\n")}`);
  }
  return resultat.data;
}

/** Chemin du webhook. Le jeton secret est vérifié dans l'en-tête, pas dans l'URL. */
export const CHEMIN_WEBHOOK = "/telegram/webhook";

// Variables d'environnement du site. Les secrets ne viennent que de l'environnement.
// La validation a lieu au démarrage du serveur (instrumentation.ts), pas au build.
import { z } from "zod";

const schemaEnv = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL est manquante." })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL doit commencer par postgresql://."),
  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET est manquante (openssl rand -base64 32)." })
    .min(32, "AUTH_SECRET doit faire au moins 32 caractères."),
  APP_URL: z
    .url({ protocol: /^https?$/, error: "APP_URL doit être une URL http ou https." })
    .transform((url) => url.replace(/\/$/, "")),
  TELEGRAM_BOT_USERNAME: z
    .string({ error: "TELEGRAM_BOT_USERNAME est manquante." })
    .regex(/^[A-Za-z0-9_]{5,32}$/, "TELEGRAM_BOT_USERNAME : nom du bot sans @, 5 à 32 caractères."),
  HASH_SALT: z.string().optional(),
});

export type EnvWeb = z.infer<typeof schemaEnv>;

let enCache: EnvWeb | undefined;

/** Valide l'environnement et lève une erreur lisible qui liste chaque variable fautive. */
export function validerEnv(source: NodeJS.ProcessEnv = process.env): EnvWeb {
  const resultat = schemaEnv.safeParse(source);
  if (!resultat.success) {
    const details = resultat.error.issues.map((i) => `- ${i.path.join(".")} : ${i.message}`);
    throw new Error(`Configuration du site invalide :\n${details.join("\n")}`);
  }
  return resultat.data;
}

/** Environnement validé, mis en cache après la première lecture. */
export function env(): EnvWeb {
  enCache ??= validerEnv();
  return enCache;
}

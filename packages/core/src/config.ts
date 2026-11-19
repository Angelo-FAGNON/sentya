// Lecture et validation des variables d'environnement utilisées par le noyau.
// Les secrets ne viennent que de l'environnement, jamais du code.
import { z } from "zod";

const schemaConfig = z.object({
  /** Facultative : sans clé, le bot fonctionne en mode dégradé, sans IA (FournisseurSansIA). */
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  GEMINI_TTS_MODEL: z.string().min(1).default("gemini-3.8-flash-tts"),
  HASH_SALT: z.string().min(16, "HASH_SALT doit faire au moins 16 caractères."),
  APP_URL: z.url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type ConfigNoyau = z.infer<typeof schemaConfig>;

let configEnCache: ConfigNoyau | undefined;

/** Une variable vide dans .env ("CLE=") est traitée comme absente. */
export function sansValeursVides(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entree): entree is [string, string] => !!entree[1]?.trim()),
  );
}

/** Valide l'environnement une seule fois et renvoie la configuration typée. */
export function lireConfig(env: NodeJS.ProcessEnv = process.env): ConfigNoyau {
  if (!configEnCache) {
    const resultat = schemaConfig.safeParse(sansValeursVides(env));
    if (!resultat.success) {
      const details = resultat.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`);
      throw new Error(`Configuration invalide.\n${details.join("\n")}`);
    }
    configEnCache = resultat.data;
  }
  return configEnCache;
}

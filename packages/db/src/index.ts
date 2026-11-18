// Point d'entrée du paquet @sentya/db : client Prisma unique (singleton) et types générés.
// Prisma 7 passe par un « driver adapter » : ici le pilote PostgreSQL natif « pg ».
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export * from "./generated/prisma/client";

/** Crée un nouveau client Prisma relié à la base indiquée (par défaut DATABASE_URL). */
export function creerClientPrisma(urlBase: string | undefined = process.env.DATABASE_URL) {
  if (!urlBase) {
    throw new Error("DATABASE_URL est manquante.");
  }
  const adapter = new PrismaPg({ connectionString: urlBase });
  return new PrismaClient({ adapter });
}

// En développement, Next.js recharge les modules à chaud : on garde le client sur
// l'objet global pour ne pas ouvrir un nouveau pool de connexions à chaque rechargement.
const globalPourPrisma = globalThis as unknown as { prismaSentya?: PrismaClient };

/** Client partagé par le bot, le web et les tâches planifiées (créé à la première utilisation). */
export function getPrisma(): PrismaClient {
  if (!globalPourPrisma.prismaSentya) {
    globalPourPrisma.prismaSentya = creerClientPrisma();
  }
  return globalPourPrisma.prismaSentya;
}

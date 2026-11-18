// Configuration de la CLI Prisma (Prisma 7 : l'URL de la base n'est plus dans le schéma).
// Prisma 7 ne charge plus le fichier .env tout seul : on le fait ici, depuis la racine.
import { config as chargerEnv } from "dotenv";
import { defineConfig } from "prisma/config";

chargerEnv({ path: new URL("../../.env", import.meta.url).pathname, quiet: true });

// "prisma generate", "validate" et "format" n'ont pas besoin de base (installation neuve,
// étape de build Docker). Les autres commandes exigent DATABASE_URL et échouent clairement.
const COMMANDES_SANS_BASE = ["generate", "validate", "format"];
const sansBase = COMMANDES_SANS_BASE.some((commande) => process.argv.includes(commande));
const urlBase = process.env.DATABASE_URL;
if (!urlBase && !sansBase) {
  throw new Error("DATABASE_URL est manquante (voir .env.example).");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: urlBase ?? "postgresql://generation-sans-base@localhost:5432/aucune",
  },
});

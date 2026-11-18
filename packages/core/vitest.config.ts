// Deux projets de tests :
// - "unitaires" : logique pure, aucune base requise ;
// - "integration" : vraie base PostgreSQL (TEST_DATABASE_URL), fichiers exécutés un par un.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unitaires",
          include: ["test/unitaires/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["test/integration/preparation-globale.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});

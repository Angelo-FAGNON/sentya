// Tests du bot : parcours complet avec de fausses mises à jour Telegram et une vraie base
// PostgreSQL (TEST_DATABASE_URL), fichiers exécutés un par un.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    globalSetup: ["../../packages/core/test/integration/preparation-globale.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

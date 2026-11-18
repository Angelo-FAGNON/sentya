// Préparation des tests d'intégration : applique les migrations sur la base de test.
// La base est indiquée par TEST_DATABASE_URL (jamais la base de développement).
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export default function preparer() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL est manquante. Exemple : postgresql://sentya:sentya@localhost:5432/sentya_test",
    );
  }
  const dossierDb = fileURLToPath(new URL("../../../db", import.meta.url));
  execSync("pnpm exec prisma migrate deploy", {
    cwd: dossierDb,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

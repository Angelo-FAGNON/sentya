// Empaquetage du bot en un seul fichier ESM. Les paquets internes (@sentya/*) sont inclus ;
// les dépendances npm restent externes et sont installées dans l'image Docker.
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [/^@sentya\//],
});

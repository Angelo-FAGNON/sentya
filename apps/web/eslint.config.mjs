// ESLint de l'application web : configuration commune du monorepo, plus les règles Next.js.
// ESLint 10 cherche la configuration depuis le dossier du fichier analysé : ce fichier
// remplace donc la configuration racine pour apps/web, d'où la reprise de celle-ci.
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";
import racine from "../../eslint.config.mjs";

export default [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...racine,
  nextPlugin.configs["core-web-vitals"],
  // Règle propre au routeur « pages », absent ici (App Router uniquement).
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
  {
    files: ["src/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
  },
];

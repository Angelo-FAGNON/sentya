// Vérifie la convention du projet : aucun tiret cadratin (U+2014) et aucun emoji
// dans les fichiers du dépôt. Échoue (code 1) si une occurrence est trouvée.
// Les caractères interdits sont écrits ici sous forme d'échappements, jamais en clair.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const RACINE = new URL("..", import.meta.url).pathname;

const DOSSIERS_IGNORES = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "generated",
  ".git",
  ".turbo",
  ".claude",
]);

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".prisma",
  ".sql",
  ".yml",
  ".yaml",
  ".css",
  ".example",
  ".toml",
  "",
]);

// Tiret cadratin, flèches et symboles techniques souvent rendus en emoji, pictogrammes,
// symboles divers, flèches et étoiles supplémentaires, drapeaux, sélecteur de variante
// emoji et liant d'emoji composés.
const MOTIF_INTERDIT = new RegExp(
  [
    "\\u2014",
    "[\\u2190-\\u21FF]",
    "[\\u2300-\\u23FF]",
    "[\\u2600-\\u27BF]",
    "[\\u2B00-\\u2BFF]",
    "[\\u{1F000}-\\u{1FAFF}]",
    "[\\u{1F1E6}-\\u{1F1FF}]",
    "\\uFE0F",
    "\\u200D",
  ].join("|"),
  "u",
);

/** Parcourt récursivement le dépôt et renvoie la liste des fichiers à contrôler. */
function listerFichiers(dossier) {
  const resultat = [];
  for (const nom of readdirSync(dossier)) {
    if (DOSSIERS_IGNORES.has(nom)) continue;
    const chemin = join(dossier, nom);
    const infos = statSync(chemin);
    if (infos.isDirectory()) {
      resultat.push(...listerFichiers(chemin));
    } else if (EXTENSIONS.has(extname(nom)) && nom !== "pnpm-lock.yaml") {
      resultat.push(chemin);
    }
  }
  return resultat;
}

let erreurs = 0;
for (const fichier of listerFichiers(RACINE)) {
  const lignes = readFileSync(fichier, "utf8").split("\n");
  lignes.forEach((ligne, index) => {
    if (MOTIF_INTERDIT.test(ligne)) {
      erreurs += 1;
      console.error(`${relative(RACINE, fichier)}:${index + 1} caractère interdit`);
    }
  });
}

if (erreurs > 0) {
  console.error(`${erreurs} occurrence(s) interdite(s) (tiret cadratin ou emoji).`);
  process.exit(1);
}
console.log("Conventions respectées : aucun tiret cadratin, aucun emoji.");

# Sentya : consignes de travail

Ces consignes s'appliquent à toute personne qui travaille sur le dépôt, membre de l'équipe ou agent IA.
L'avancement du projet est suivi dans [SUIVIE.md](SUIVIE.md).

## Avant de commencer

1. Lire le [README](README.md) : installation, commandes, variables d'environnement, limites connues.
2. Lire [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) : hypothèses, choix techniques, modèle de données.
3. Lire [SUIVIE.md](SUIVIE.md) : ce qui est livré, ce qui reste à faire.

## Commandes

| Commande                               | Rôle                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `pnpm install`                         | Installer les dépendances                            |
| `docker compose up -d postgres`        | Lancer PostgreSQL seul                               |
| `pnpm db:deploy && pnpm db:seed`       | Appliquer les migrations et charger le seed          |
| `pnpm dev:bot` / `pnpm dev:web`        | Lancer le bot et le site (deux terminaux)            |
| `pnpm lint`                            | ESLint, puis contrôle des conventions                |
| `pnpm format` / `pnpm format:check`    | Formater avec Prettier / vérifier le formatage       |
| `pnpm typecheck`                       | TypeScript strict sur tout le monorepo               |
| `pnpm db:migrate`                      | Créer une migration après une modification du schéma |
| `pnpm --filter @sentya/core test:tout` | Tests du noyau, unitaires et intégration             |
| `pnpm --filter @sentya/bot test`       | Parcours complet du bot avec mises à jour simulées   |
| `pnpm --filter @sentya/web test`       | Tests du site                                        |

## Conventions d'écriture

- Le code, les commentaires, les messages et la documentation sont en français.
- Aucun tiret cadratin, aucune flèche, aucun emoji, dans aucun fichier. `pnpm lint` échoue sinon (`scripts/check-conventions.mjs`).
- Phrases courtes et claires, surtout dans les messages du bot : le public est jeune et souvent en 3G.
- TypeScript strict avec `noUncheckedIndexedAccess` : pas de `any`, pas de contournement des types.
- Prettier formate tout ; ne pas reformater à la main.

## Règles métier à ne jamais casser

Les règles RG-01 à RG-12 sont détaillées dans [docs/RECETTE.md](docs/RECETTE.md). En particulier :

- **Aucune donnée inventée** : chaque contact, coût, durée ou adresse vient de la base, sinon il affiche « À vérifier par le curateur ».
- **Pistes dans le référentiel** : chaque piste référence un `Metier` existant du bon pays.
- **Consentement et âge** : aucun profil avant le consentement, aucun profil pour un mineur.
- **Données sensibles** : santé, religion, origine et politique ne sont jamais enregistrées.
- **Pas de promesse, pas de paiement** : la décision appartient au jeune.
- **Journaux sans identité** : ni texte de message, ni identifiant Telegram, ni prénom dans les logs.
- **Partage avec un partenaire** : uniquement après l'accord explicite du jeune, pour cette offre seulement.

## IA

- Claude pour le raisonnement, Gemini pour l'audio seulement (`FournisseurComposite`).
- Les textes envoyés à l'IA sont pseudonymisés avant l'appel.
- Les prompts sont versionnés dans `packages/core/src/prompts`. Toute modification d'un texte de prompt crée un nouveau fichier (`.v2.ts`, `.v3.ts`) ; l'ancienne version reste en place pour expliquer les recommandations passées.
- Sortie invalide : une seule nouvelle tentative, puis repli déterministe.
- Le parcours doit rester utilisable sans clé Claude ni clé Gemini (mode sans IA). Tester ce cas après toute modification de l'IA.

## Base de données

- Toute modification de `schema.prisma` passe par `pnpm db:migrate`, et la migration est commitée.
- Le seed est en création seule : il ne doit jamais écraser une fiche modifiée par un curateur.
- `TEST_DATABASE_URL` est vidée à chaque test : ne jamais y mettre la base de développement.

## Secrets

- Ne jamais commiter `.env`. Seul `.env.example` est versionné ; y ajouter toute nouvelle variable, sans valeur réelle.
- Documenter chaque nouvelle variable dans la section « Variables d'environnement » du README.

## Avant de livrer

- [ ] `pnpm lint`, `pnpm typecheck` et `pnpm format:check` passent.
- [ ] Les tests du ou des paquets touchés passent.
- [ ] Le README, l'architecture et la recette sont à jour si le comportement a changé.
- [ ] [SUIVIE.md](SUIVIE.md) est mis à jour (journal, à faire).

## Git

- Messages de commit en français : un titre court qui dit ce qui change, puis une liste à puces des points importants.
- Un commit par sujet cohérent ; ne pas mélanger une correction et une nouvelle fonctionnalité.

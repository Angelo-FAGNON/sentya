# Sentya

Sentya est un conseiller d'orientation professionnelle sur Telegram, pour les jeunes du Bénin et du Togo.
En moins de 15 minutes, le jeune passe de « je ne sais pas quoi faire » à un plan d'action en 3 étapes vérifiées.

- **Raconter** : le jeune décrit ce qu'il sait faire, par écrit ou par vocal.
- **Choisir** : il reçoit 3 pistes réalistes, justifiées et sourcées, et en choisit une.
- **Avancer** : il reçoit un plan en 3 étapes, des opportunités vérifiées et des rappels.

Le noyau d'orientation est gratuit pour le jeune.

> **Important : le seed est un jeu de démonstration à valider.**
> Les métiers, programmes, formations et modèles d'étapes du seed sont au statut `A_VERIFIER`.
> Tous les contacts, adresses, coûts et durées portent la mention « À vérifier par le curateur ».
> Un curateur doit vérifier chaque fiche dans le back-office avant tout usage réel.

## Sommaire

1. [Contenu du dépôt](#contenu-du-dépôt)
2. [Installation locale (moins de 10 minutes)](#installation-locale-moins-de-10-minutes)
3. [Créer le bot avec BotFather](#créer-le-bot-avec-botfather)
4. [Développer sans Docker](#développer-sans-docker)
5. [Tests](#tests)
6. [Configurer le webhook](#configurer-le-webhook)
7. [Déployer sur un VPS](#déployer-sur-un-vps)
8. [Variables d'environnement](#variables-denvironnement)
9. [Limites connues](#limites-connues)

## Contenu du dépôt

```
apps/bot        Bot Telegram (grammY) : polling ou webhook, tâches pg-boss, PDF, audio
apps/web        Site public, back-office (admin, curateur) et espace partenaire (Next.js)
packages/core   Logique métier : parcours, orientation, client Gemini, prompts, règles RG-01 à RG-12
packages/db     Schéma Prisma, migrations et seed
docs/           Architecture (ARCHITECTURE.md) et checklist de recette (RECETTE.md)
deploiement/    Surcouche Docker de production et configuration Caddy (TLS)
```

Les choix techniques et les hypothèses sont décrits dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Installation locale (moins de 10 minutes)

**Prérequis** : Docker 24 ou plus récent, avec Docker Compose v2.24 ou plus récent.

1. Copier la configuration :

   ```bash
   cp .env.example .env
   ```

2. Remplir `.env` :
   - `TELEGRAM_BOT_TOKEN` et `TELEGRAM_BOT_USERNAME` : voir [Créer le bot avec BotFather](#créer-le-bot-avec-botfather) ;
   - `AUTH_SECRET` et `HASH_SALT` : générer chaque valeur avec `openssl rand -base64 32` ;
   - `ADMIN_EMAIL` et `ADMIN_PASSWORD` : premier compte du back-office (12 caractères minimum) ;
   - `GEMINI_API_KEY` : facultative (voir plus bas).

3. Lancer l'ensemble :

   ```bash
   docker compose up --build
   ```

   Docker démarre PostgreSQL, applique les migrations, charge le seed, puis lance le bot et le site.

4. Tester :
   - ouvrir `https://t.me/<TELEGRAM_BOT_USERNAME>` et appuyer sur **Démarrer** ;
   - ouvrir le site : http://localhost:3000 ;
   - ouvrir le back-office : http://localhost:3000/admin, avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`. À la première connexion, scanner le QR code avec une application TOTP (Google Authenticator, Aegis...). Le code est ensuite demandé à chaque connexion.
   - vérifier la santé du bot : http://localhost:8080/health

**Sans clé Gemini**, le bot fonctionne en mode dégradé. Les compétences sont repérées par mots-clés et les pistes sont marquées « à explorer ». Un message vocal reçoit une demande d'écrire la réponse, et il n'y a pas de réponse audio. C'est utile pour une démonstration ou pendant une panne prolongée. Pour le mode complet, créer une clé sur https://aistudio.google.com et la mettre dans `GEMINI_API_KEY`.

## Créer le bot avec BotFather

1. Dans Telegram, ouvrir **@BotFather**. C'est le compte officiel, avec le badge bleu vérifié.
2. Envoyer `/newbot`.
3. Donner un nom affiché, par exemple `Sentya`.
4. Donner un nom d'utilisateur qui finit par `bot`, par exemple `SentyaOrientationBot`.
5. BotFather répond avec un jeton de la forme `123456789:AA...`. Le copier dans `TELEGRAM_BOT_TOKEN`. Ce jeton est secret : ne jamais le partager ni le commiter.
6. Mettre le nom d'utilisateur, sans `@`, dans `TELEGRAM_BOT_USERNAME`.

Le menu des commandes (`/start`, `/plan`, `/changer`, `/recommencer`, `/monplan`, `/parametres`, `/supprimer`) est déclaré automatiquement au démarrage du bot.

Recommandé ensuite, toujours dans BotFather :

- `/setdescription` : « Ton conseiller d'orientation gratuit. Raconte ce que tu sais faire, je te propose 3 pistes et un plan. »
- `/setprivacy` : laisser activé, car le bot ne répond qu'en conversation privée.

Pour un lien de suivi par canal, utiliser `https://t.me/<bot>?start=affiche` : le code `affiche` apparaît dans l'indicateur « nouveaux utilisateurs par canal ».

## Développer sans Docker

**Prérequis** : Node.js 22.12 ou plus récent, pnpm 10 (`npm install -g pnpm@10`), et Docker pour PostgreSQL.

```bash
pnpm install
```

```bash
docker compose up -d postgres
```

```bash
pnpm db:deploy && pnpm db:seed
```

Dans deux terminaux :

```bash
pnpm dev:bot
```

```bash
pnpm dev:web
```

Commandes utiles :

| Commande          | Rôle                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| `pnpm lint`       | ESLint, puis contrôle des conventions (aucun tiret cadratin, aucun emoji) |
| `pnpm format`     | Prettier                                                                  |
| `pnpm typecheck`  | TypeScript strict sur tout le monorepo                                    |
| `pnpm db:migrate` | Créer une migration après une modification du schéma                      |

## Tests

Les tests d'intégration utilisent une vraie base PostgreSQL, indiquée par `TEST_DATABASE_URL`. Elle est vidée à chaque test : ne jamais y mettre la base de développement.

```bash
docker compose exec postgres createdb -U sentya sentya_test
```

```bash
export TEST_DATABASE_URL=postgresql://sentya:sentya@localhost:5432/sentya_test
```

| Commande                               | Contenu                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @sentya/core test`      | Tests unitaires du noyau (sans base)                                                                                                                 |
| `pnpm --filter @sentya/core test:tout` | Unitaires et intégration : RG-01 à RG-12, pseudonymisation, sorties de l'IA, ancrage des pistes, égalité de traitement, rappels avec horloge simulée |
| `pnpm --filter @sentya/bot test`       | Parcours complet du bot avec des mises à jour Telegram simulées, serveur webhook, limitation du débit                                                |
| `pnpm --filter @sentya/web test`       | Chiffrement TOTP, contrôle des rôles, formulaires                                                                                                    |

La checklist de recette manuelle est dans [docs/RECETTE.md](docs/RECETTE.md).

## Configurer le webhook

En production, Telegram envoie chaque message au bot par HTTPS (webhook), au lieu du long polling.

1. Définir dans `.env` :
   - `BOT_MODE=webhook` ;
   - `BOT_PUBLIC_URL=https://bot.mondomaine.example` ;
   - `TELEGRAM_WEBHOOK_SECRET`, une chaîne aléatoire générée avec `openssl rand -hex 24`.
2. Au démarrage, le bot appelle `setWebhook` avec l'URL `BOT_PUBLIC_URL/telegram/webhook` et le jeton secret.
3. Chaque requête reçue doit porter l'en-tête `X-Telegram-Bot-Api-Secret-Token`. Sinon, le bot répond 401.

Vérifier l'état du webhook :

```bash
curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

Le bot répond à Telegram en moins de 9 secondes. Si un traitement est plus long (génération des pistes), il continue en arrière-plan. Une mise à jour renvoyée par Telegram est ignorée grâce à son `update_id`.

## Déployer sur un VPS

Exemple pour un VPS Linux (Ubuntu 24.04, 2 Go de RAM) avec deux sous-domaines.

1. **DNS** : créer deux enregistrements A vers l'adresse du VPS, par exemple `sentya.mondomaine.example` (site) et `bot.mondomaine.example` (webhook).
2. **Docker** :

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Code et configuration** :

   ```bash
   git clone <url-du-depot> sentya && cd sentya && cp .env.example .env
   ```

   Remplir `.env` comme en local, et ajouter :
   - `DOMAINE_WEB` et `DOMAINE_BOT` ;
   - `APP_URL=https://<DOMAINE_WEB>` ;
   - `TELEGRAM_WEBHOOK_SECRET` ;
   - un `POSTGRES_PASSWORD` fort.

4. **Lancement**. Caddy obtient les certificats TLS automatiquement, et le bot passe en mode webhook :

   ```bash
   docker compose -f docker-compose.yml -f deploiement/docker-compose.prod.yml up -d --build
   ```

5. **Pare-feu** : n'ouvrir que les ports 22, 80 et 443. PostgreSQL et le bot ne sont pas exposés : Caddy ne transmet que `/telegram/webhook` et `/health`.

6. **Sauvegardes quotidiennes**, par exemple avec cron :

   ```bash
   docker compose exec -T postgres pg_dump -U sentya sentya | gzip > sauvegarde-$(date +%F).sql.gz
   ```

7. **Mise à jour** : `git pull`, puis relancer la commande de l'étape 4. Les migrations s'appliquent automatiquement avant le redémarrage du bot et du site.

## Variables d'environnement

| Variable                        | Obligatoire          | Rôle                                                                        |
| ------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`            | oui                  | Jeton du bot donné par BotFather                                            |
| `TELEGRAM_WEBHOOK_SECRET`       | en webhook           | Jeton secret vérifié sur chaque appel du webhook                            |
| `TELEGRAM_BOT_USERNAME`         | oui                  | Nom du bot, pour le lien t.me et le QR code                                 |
| `BOT_MODE`                      | non                  | `polling` (par défaut) ou `webhook`                                         |
| `BOT_PUBLIC_URL`                | en webhook           | URL publique HTTPS du bot                                                   |
| `GEMINI_API_KEY`                | non                  | Clé de l'API Gemini ; sans clé, mode dégradé sans IA                        |
| `GEMINI_MODEL`                  | non                  | Modèle Gemini (audio, PDF, JSON structuré). Par défaut : `gemini-3.8-flash` |
| `GEMINI_TTS_MODEL`              | non                  | Modèle de synthèse vocale. Par défaut : `gemini-3.8-flash-tts`              |
| `DATABASE_URL`                  | oui                  | Connexion PostgreSQL (remplacée dans Docker)                                |
| `POSTGRES_PASSWORD`             | oui en production    | Mot de passe du PostgreSQL de Docker                                        |
| `APP_URL`                       | oui                  | URL publique du site (liens magiques, page de confidentialité)              |
| `AUTH_SECRET`                   | oui                  | Secret Auth.js ; sert aussi à chiffrer les secrets TOTP                     |
| `HASH_SALT`                     | oui                  | Sel secret du hachage des identifiants pour les analyses                    |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | au premier lancement | Premier administrateur, créé par le seed                                    |
| `DOMAINE_WEB`, `DOMAINE_BOT`    | en production        | Domaines servis par Caddy                                                   |

Les secrets ne sont lus que dans l'environnement, jamais dans le code.

## Limites connues

- **Seed de démonstration** : toutes les fiches sont à vérifier. Le site de l'AnpE Bénin (anpe.bj) n'a pas pu être consulté lors de la préparation. Les conditions du CQM et du CQP, ainsi que le portail d'inscription de l'ANPE Togo, restent à confirmer.
- **Pseudonymisation** : elle retire les e-mails, liens, numéros, adresses et les noms introduits par une formule (« je m'appelle », « chez », « mon patron », civilités), ainsi que le prénom du profil. Un nom propre cité sans contexte peut passer. C'est une pseudonymisation, pas une anonymisation complète.
- **Audio et CV** : un vocal ou un CV est envoyé tel quel à Gemini, car un fichier ne peut pas être pseudonymisé avant l'appel. Le prompt interdit de recopier les données d'identité. Sentya n'écrit jamais le fichier sur disque ni en base, mais Telegram en garde une copie sur ses serveurs, selon ses propres règles.
- **Données sensibles (RG-08)** : le filtre retire toute phrase qui contient un mot lié à la santé, à la religion, à l'origine ou à la politique. Il peut retirer une phrase utile (« j'ai travaillé pour une église »). Ce choix est volontaire : mieux vaut perdre une phrase que garder une donnée sensible.
- **Mode sans IA** : sans clé Gemini, les pistes viennent du seul classement par compétences et sont marquées « à explorer ». Les vocaux ne sont pas transcrits.
- **Une seule instance du bot** : la limitation du débit (20 messages par minute) et le verrou par jeune sont en mémoire. Pour plusieurs instances, il faudra les déplacer en base.
- **Rappels** : ils partent entre 8 h et 20 h, heure du Bénin et du Togo (UTC+1). Un rappel prévu la nuit part le lendemain matin.
- **Modèles Gemini** : les noms de modèles évoluent. Vérifier `GEMINI_MODEL` et `GEMINI_TTS_MODEL` sur la page des modèles de Google avant un déploiement.
- **Poids de la page d'accueil** : 181 Ko transférés (compression gzip), 482 Ko non compressés pour un navigateur moderne. Le total non compressé atteint 593 Ko si l'on compte le polyfill que Next.js ne sert qu'aux très anciens navigateurs.
- **Double authentification** : un code TOTP reste valable pendant sa fenêtre de 30 secondes et peut y être réutilisé (pas de mémorisation du dernier code utilisé).
- **Adresse IP des visiteurs** : la limitation des tentatives de connexion et le journal des accès lisent l'en-tête `X-Forwarded-For`. Il n'est fiable que derrière Caddy, comme dans la configuration de production.
- **Lien magique en local** : Telegram refuse les boutons vers `localhost`. En développement, le lien `/monplan` arrive donc en texte dans le message ; en production (HTTPS), il arrive en bouton.
- **Candidatures** : le partenaire consulte les candidatures dans son espace. Il n'existe pas de notification par e-mail dans ce MVP.
- **Hors périmètre** : WhatsApp (l'interface `Canal` du noyau le prépare), langues nationales, mentorat humain, application mobile, paiement.

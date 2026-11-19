# Sentya : architecture du MVP

Ce document fixe les hypothèses, les choix techniques, l'arborescence et le modèle de données.

## 1. Hypothèses retenues

| N   | Hypothèse                                                                                                                                   | Conséquence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Le seed est un jeu de démonstration. Ses métiers, formations et programmes sont au statut `A_VERIFIER`.                                     | Les métiers, formations, programmes et modèles d'étapes sont **éligibles** aux pistes s'ils sont `VERIFIEE` ou `A_VERIFIER`. Une fiche `A_VERIFIER` s'affiche avec la mention « À vérifier ». `BROUILLON` et `SUSPENDUE` sont toujours exclus. Sans cette règle, le bot serait inutilisable après le seed.                                                                                                                                                                                                      |
| H2  | Les **opportunités** restent strictement `VERIFIEE` (EF-09, RG-05).                                                                         | Le seed ne crée aucune opportunité vérifiée. Le plan fonctionne sans elles et en ajoute dès qu'un curateur en vérifie.                                                                                                                                                                                                                                                                                                                                                                                          |
| H3  | L'identifiant Telegram brut est conservé, car il faut pouvoir envoyer les rappels.                                                          | `User.telegramId` (unique, mis à null à l'anonymisation) et `User.userHash` (HMAC-SHA256 avec un sel secret `HASH_SALT`). Les analyses et les journaux n'utilisent que le hachage.                                                                                                                                                                                                                                                                                                                              |
| H4  | Avant le consentement, rien n'est écrit en base (RG-01).                                                                                    | Le pays et le code d'acquisition voyagent dans les données des boutons Telegram (64 octets maximum). Seule la table d'idempotence reçoit l'`update_id`, qui n'est pas une donnée personnelle. Le profil est créé au clic sur « J'ai 18 ans ou plus ».                                                                                                                                                                                                                                                           |
| H5  | `Competence` est un vocabulaire commun aux deux pays.                                                                                       | Pas de pays, de source ni de statut sur cette table. `RegleFraude` n'a pas de pays (règles communes). `ModeleEtape` porte une source, une date et un statut.                                                                                                                                                                                                                                                                                                                                                    |
| H6  | Les indicateurs doivent survivre à la suppression des comptes (RG-11) et à l'anonymisation (RG-12).                                         | Le tableau de bord est calculé à partir de `EvenementAnalytique`, jamais à partir des tables du jeune. À la suppression comme à l'anonymisation, le hachage du jeune est remplacé par une valeur aléatoire dans les événements et dans le journal des recommandations, et dans `User.userHash` en cas d'anonymisation : les chiffres restent, le lien est rompu, et la même personne peut recréer un profil sans conflit d'unicité. Ses échantillons de revue qualité (`RevueQualite.userHash`) sont supprimés. |
| H7  | La suppression d'un jeune ne doit pas annuler une suspension (RG-06).                                                                       | `Opportunite.nbSignalements` est un compteur, pas un comptage de lignes. Les lignes `Signalement` du jeune sont supprimées, mais le compteur et `suspendueLe` restent.                                                                                                                                                                                                                                                                                                                                          |
| H8  | Le bot tourne sur un seul serveur dans le MVP.                                                                                              | La limitation de débit est en mémoire, par jeune. Elle pourra passer en base si plusieurs instances tournent.                                                                                                                                                                                                                                                                                                                                                                                                   |
| H9  | Modèle Gemini par défaut : `gemini-3.8-flash` (stable, entrée audio et PDF, sorties structurées). Synthèse vocale : `gemini-3.8-flash-tts`. | Les deux se règlent par `GEMINI_MODEL` et `GEMINI_TTS_MODEL`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| H10 | Les rappels partent entre 8 h et 20 h, heure de Cotonou et de Lomé (UTC+1, même fuseau, sans heure d'été).                                  | Un rappel prévu la nuit est décalé au matin.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

## 2. Choix techniques justifiés

| Sujet                | Choix                                                                                          | Pourquoi                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo             | pnpm workspaces, Node 22                                                                       | Imposé. pnpm est rapide et économise le disque. Node 22 est une version LTS compatible avec Prisma 7 et Next 16.                                                                                                                                                                                                                                                                          |
| TypeScript           | 5.9.3, mode strict et `noUncheckedIndexedAccess`                                               | TypeScript 7 existe, mais `typescript-eslint` exige une version inférieure à 6.1. On garde la version la plus récente compatible avec tout l'outillage.                                                                                                                                                                                                                                   |
| Paquets internes     | `packages/*` exportent directement leurs sources `.ts`                                         | Pas d'étape de compilation entre paquets. Next.js les transpile (`transpilePackages`). Le bot est empaqueté par tsup en un seul fichier pour la production. Vitest lit le TypeScript directement.                                                                                                                                                                                         |
| Bot                  | grammY. Long polling en dev, webhook en prod                                                   | Imposé. Le serveur webhook est un simple `node:http` (sobriété). Il vérifie l'en-tête `X-Telegram-Bot-Api-Secret-Token` et expose `/health`.                                                                                                                                                                                                                                              |
| État de conversation | Machine à états maison, persistée dans `ConversationState`                                     | Le plugin `conversations` de grammY rejoue le code à chaque message, ce qui est fragile en cas de redémarrage. Un état explicite en base rend la reprise simple et testable.                                                                                                                                                                                                              |
| Canal                | Interface `Canal` dans `core`, implémentée par `TelegramCanal`                                 | Le parcours ne connaît que `Canal` : envoyer un texte, des boutons, un vocal ou un fichier. WhatsApp sera une deuxième implémentation.                                                                                                                                                                                                                                                    |
| Base                 | PostgreSQL 16 + Prisma 7.10.1 (adaptateur `pg`)                                                | Imposé. La CLI, le client et l'adaptateur sont fixés à la même version, car `prisma@latest` pointe actuellement vers une version RC.                                                                                                                                                                                                                                                      |
| Tâches planifiées    | pg-boss, dans le processus du bot                                                              | Imposé, sans Redis. Le bot détient le jeton Telegram, il exécute donc les rappels. pg-boss utilise son propre schéma `pgboss`, distinct de celui de Prisma. Tâches : rappels J+3, J+7 et J+30 ; nouvel essai Gemini ; péremption à 6 mois (quotidienne) ; anonymisation à 12 mois (quotidienne) ; échantillon de revue qualité (hebdomadaire) ; purge des `update_id` de plus de 7 jours. |
| IA                   | `@google/genai`, `responseSchema` JSON, validation zod                                         | Imposé. Une seule nouvelle tentative, puis repli déterministe. L'audio Telegram (ogg/opus) est envoyé directement à Gemini.                                                                                                                                                                                                                                                               |
| Web                  | Next.js 16 (App Router) + Tailwind CSS 4                                                       | Imposé. Les Server Actions de Next vérifient l'origine des requêtes (protection CSRF). Les routes API maison vérifient aussi l'en-tête `Origin`.                                                                                                                                                                                                                                          |
| Authentification     | Auth.js v5 (`next-auth@beta`), fournisseur « identifiants » + TOTP (otplib)                    | Auth.js v5 est la version compatible avec Next 16 et l'App Router. Deux fournisseurs : administrateurs (TOTP obligatoire, enrôlement forcé à la première connexion) et partenaires. Le secret TOTP est chiffré en base (AES-256-GCM, clé dérivée de `AUTH_SECRET`).                                                                                                                       |
| Mots de passe        | argon2id                                                                                       | Imposé.                                                                                                                                                                                                                                                                                                                                                                                   |
| Lien magique         | Jeton aléatoire de 32 octets, valable 15 minutes, à usage unique. Seul son SHA-256 est stocké. | Une fuite de la base ne donne aucun lien exploitable.                                                                                                                                                                                                                                                                                                                                     |
| PDF du plan          | pdfkit, polices standard, sans image                                                           | Fichier de quelques Ko, adapté à la 3G.                                                                                                                                                                                                                                                                                                                                                   |
| QR code              | `qrcode`, généré en SVG                                                                        | Pas d'image lourde sur la page d'accueil.                                                                                                                                                                                                                                                                                                                                                 |
| Journaux             | pino (JSON), sans donnée d'identité                                                            | Exigé.                                                                                                                                                                                                                                                                                                                                                                                    |
| Tests                | Vitest. Test de bout en bout avec de fausses mises à jour Telegram et un faux Gemini           | Exigé. La base de test est un vrai PostgreSQL (service Docker), pour tester les cascades et les contraintes.                                                                                                                                                                                                                                                                              |

## 3. Arborescence

```
sentya/
  package.json, pnpm-workspace.yaml   monorepo pnpm 10, scripts racine
  tsconfig.base.json                  TypeScript strict
  eslint.config.mjs, .prettierrc.json ESLint et Prettier
  .env.example                        toutes les variables, commentées
  Dockerfile                          cibles outils (migrations, seed), bot, web
  docker-compose.yml                  postgres, migrations, bot, web
  deploiement/
    docker-compose.prod.yml           surcouche de production (Caddy, webhook)
    Caddyfile                         TLS automatique, proxy inverse
  docs/
    ARCHITECTURE.md                   ce document
    RECETTE.md                        checklist de recette manuelle
  scripts/
    check-conventions.mjs             refuse tiret cadratin et emoji
  packages/
    db/
      prisma.config.ts                configuration Prisma 7
      prisma/schema.prisma            27 tables
      prisma/migrations/              migration initiale
      prisma/seed.ts                  seed idempotent, contrôles avant écriture
      prisma/seed-data/               compétences, métiers, programmes, formations,
                                      modèles d'étapes, règles de fraude, sources vérifiées
      src/index.ts                    client Prisma partagé (adaptateur pg)
    core/
      src/
        config.ts, contexte.ts        configuration et dépendances injectées
        horloge.ts, dates.ts          horloge simulable, dates à UTC+1
        journal.ts, texte.ts          pino sans identité, normalisation du texte
        messages/fr.ts                tous les textes du bot
        canal/canal.ts                interface Canal (Telegram, puis WhatsApp)
        prompts/                      prompts versionnés : extraction-competences,
                                      correction-competences, choix-pistes,
                                      reformulation, transcription
        ia/
          fournisseur.ts              interface et erreurs (indisponible, invalide)
          appel-structure.ts          JSON validé par zod, un nouvel essai, puis repli
          gemini.ts                   client @google/genai (JSON, audio, PDF, TTS)
          sans-ia.ts                  mode dégradé sans clé
          factice.ts                  IA factice pour les tests
          schemas.ts                  schémas zod des sorties
        confidentialite/
          pseudonymisation.ts         retire noms, numéros, adresses, e-mails
          donnees-sensibles.ts        filtre RG-08
          hachage.ts                  HMAC des identifiants, jetons
        orientation/
          bilan.ts                    questions et réponses (EF-02)
          competences.ts              extraction, repli par mots-clés, correction
          preselection.ts             étape 1 : jusqu'à 15 métiers, sans IA
          pistes.ts                   étapes 2 et 3 : choix IA, ancrage, journal
          fiche.ts, plan.ts           fiche piste, plan en 3 étapes, statuts
          profil.ts, reformulation.ts normalisation, reformulation contrôlée
        regles/                       consentement, eligibilite, sources, fraude,
                                      peremption, rappels, candidature,
                                      lien-magique, suppression, anonymisation
        parcours/
          moteur.ts                   machine à états du parcours (tous les écrans)
          rappels.ts                  envoi d'un rappel J+3, J+7, J+30
          actions.ts, envoi.ts        actions des boutons, envoi et audio
          types.ts                    état persistant, dépendances, planificateur
        analytique/                   événements et indicateurs du tableau de bord
        qualite/revue.ts              échantillon hebdomadaire de revue
      test/unitaires/                 tests sans base
      test/integration/               tests sur PostgreSQL réel (RG-01 à RG-12)
  apps/
    bot/
      src/
        index.ts                      démarrage : polling ou webhook
        bot.ts                        grammY : idempotence, débit, verrou, moteur
        conversion.ts                 mise à jour Telegram vers message du noyau
        telegram-canal.ts             implémentation de Canal
        serveur.ts                    node:http : /health et webhook (jeton secret)
        middlewares/                  idempotence, limite-debit, verrou
        taches/taches.ts              pg-boss : rappels, reprise IA, tâches planifiées
        pdf/plan-pdf.ts               PDF du plan (pdfkit)
        audio.ts                      PCM vers OGG/Opus (ffmpeg)
      test/                           parcours complet simulé, serveur, configuration
    web/
      src/
        app/page.tsx                  accueil : promesse, 3 étapes, lien t.me, QR code
        app/confidentialite, conditions, suppression
                                      pages publiques en français simple
        app/monplan/[jeton]/          lien magique : GET affiche un bouton, POST consomme
        app/admin/connexion, 2fa/     connexion (mot de passe + TOTP), enrôlement TOTP
        app/admin/(bo)/               tableau de bord, CRUD du référentiel (métiers,
                                      compétences, formations, programmes, modèles
                                      d'étapes, opportunités, règles de fraude),
                                      signalements, revue qualité ; partenaires,
                                      utilisateurs et journal (ADMIN seulement)
        app/partenaire/               inscription, connexion, offres, candidatures
        app/api/health, api/auth/     santé ; Auth.js (contrôle de l'en-tête Origin)
        auth.ts, auth.config.ts       Auth.js v5 : fournisseurs admin et partenaire
        proxy.ts                      CSP avec nonce, protection des routes
        lib/                          chiffrement TOTP, rôles, limiteur, schémas zod,
                                      journal des accès, Origin, IP, contexte du noyau
        composants/                   cadres public et admin, formulaires, fiches
      test/                           TOTP, chiffrement, rôles, limiteur, schémas,
                                      sécurité, textes publics, mots de passe
```

## 4. Flux principaux

**Parcours du jeune (bot)**

1. `/start` : 3 messages courts, puis les boutons Bénin et Togo. Rien n'est écrit.
2. Consentement, puis âge. Le profil est créé seulement après « J'ai 18 ans ou plus ».
3. Bilan : 6 questions, en texte ou en vocal. Chaque réponse passe par trois traitements avant d'être écrite : transcription (vocal), filtre des données sensibles (RG-08), puis pseudonymisation avant tout appel à Gemini.
4. Extraction des compétences (Gemini, JSON, identifiants du référentiel), récapitulatif, puis « Oui » ou « Corriger ».
5. « Je réfléchis... », puis 3 pistes : présélection en code, choix par Gemini parmi les identifiants fournis, validation serveur, et complément « à explorer » si besoin.
6. Fiche piste, « Choisir cette piste », puis plan en 3 étapes construit à partir de `ModeleEtape` et des opportunités vérifiées.
7. Rappels J+3, J+7 et J+30, avec des boutons de statut pour chaque étape.

**Si Gemini est indisponible** : le message du jeune est conservé dans son état de conversation. Le bot répond « Je reviens vers toi dans quelques minutes » et programme un travail pg-boss avec un délai croissant. Le travail reprend l'étape là où elle s'était arrêtée.

**Suppression (RG-11)** : confirmation en deux temps, puis une seule transaction. On supprime le `User` (cascade sur toutes ses tables), on rompt le hachage dans `EvenementAnalytique` et `RecommandationLog`, on supprime ses échantillons `RevueQualite`, et on annule ses travaux pg-boss. Les gestionnaires de travaux ignorent un jeune introuvable.

**Anonymisation (RG-12)** : tâche quotidienne. Pour chaque profil inactif depuis 12 mois, on supprime l'état, le bilan, les compétences, les liens magiques et les échantillons de revue. On met `telegramId`, `prenom` et `ville` à null, on remplace `userHash` par une valeur aléatoire (dans `User`, les événements et le journal des recommandations), puis on renseigne `anonymiseLe`. Les pistes et les plans restent, sans lien avec une personne, pour les indicateurs.

## 5. Modèle de données

Le schéma complet se trouve dans `packages/db/prisma/schema.prisma`. Voici les ajouts par rapport au modèle fourni, avec leur raison.

| Ajout                                                                                                    | Raison                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User.userHash`, `User.canal`, `User.sourceAcquisition`, `User.anonymiseLe`                              | H3, indicateur « nouveaux utilisateurs par canal », RG-12                                                                                                                                            |
| Identifiants lisibles pour `Competence` et `Metier` (ex. `bj-mecanique-moto`)                            | L'IA manipule des identifiants explicites. Une erreur d'identifiant se repère facilement dans les journaux.                                                                                          |
| `MetierFormation`                                                                                        | Relier les formations aux métiers pour la fiche piste (durée et coût de la voie)                                                                                                                     |
| `Programme.voies`                                                                                        | Choisir les programmes pertinents selon la voie                                                                                                                                                      |
| `ModeleEtape.sourceUrl`, `verifieLe`, `statut`, et unicité `(metierId, voie, ordre)`                     | RG-04, et une seule étape type par position                                                                                                                                                          |
| `Piste.lotId`, `Piste.rang`                                                                              | Retrouver le lot de 3 pistes et l'ordre d'affichage                                                                                                                                                  |
| `Plan.actif`                                                                                             | `/changer` désactive l'ancien plan sans le perdre                                                                                                                                                    |
| Copie de `sourceUrl` et `verifieLe` dans `PlanEtape`, plus `opportuniteId`, `programmeId`, `formationId` | Afficher la source de chaque information (RG-04) et le bouton « Signaler »                                                                                                                           |
| `Rappel`                                                                                                 | Idempotence des rappels et tests avec une horloge simulée                                                                                                                                            |
| `PartenaireCompte`                                                                                       | Connexion des partenaires (EF-13)                                                                                                                                                                    |
| `Opportunite.suspendueLe`, `revueLe`, `alerteFraude`, `motifsAlerte`                                     | Alerte de revue sous 48 heures (RG-06), alerte préventive (EF-10)                                                                                                                                    |
| Unicité `Signalement(opportuniteId, userId)`                                                             | 3 signalements **indépendants**                                                                                                                                                                      |
| `Signalement.decision`, `traiteLe`, `traiteParId`                                                        | File des signalements dans le back-office                                                                                                                                                            |
| Unicité `Candidature(userId, opportuniteId)`                                                             | Un accord par opportunité (RG-07)                                                                                                                                                                    |
| `RegleFraude.typeMotif`, `categorie`, `bloquante`                                                        | Mot-clé ou expression régulière. Une règle « bloquante » fait refuser l'offre (frais demandés au candidat, RG-05).                                                                                   |
| `RecommandationLog`                                                                                      | Expliquer chaque recommandation a posteriori, sans identité                                                                                                                                          |
| `ProcessedUpdate`                                                                                        | Idempotence des mises à jour Telegram                                                                                                                                                                |
| `MagicLink`                                                                                              | Lien à usage unique (EF-11)                                                                                                                                                                          |
| `AdminUser.id`, `totpActive`, `actif`                                                                    | Enrôlement TOTP, désactivation d'un compte                                                                                                                                                           |
| `JournalAcces`                                                                                           | Journal des accès au back-office                                                                                                                                                                     |
| `RevueQualite.semaine`, `RevueQualite.userHash`                                                          | Échantillon hebdomadaire de 50 conversations. Le hachage sert uniquement à purger l'échantillon (RG-11, RG-12). La pseudonymisation par expressions régulières n'est pas une anonymisation complète. |

**Règles de suppression** : toutes les tables du jeune sont en `onDelete: Cascade`. Un métier référencé par une piste ne peut pas être supprimé (`Restrict`) : le curateur le passe en `SUSPENDUE`.

Ce comportement a été vérifié sur un vrai PostgreSQL 16. On a créé un jeune avec un état, un bilan, des compétences, une piste, un plan, des étapes, un rappel, un signalement, une candidature et un lien magique. Après sa suppression, il reste 0 ligne. Le compteur de signalements de l'opportunité et le référentiel sont conservés.

## 6. Sécurité (résumé)

- TLS assuré par un proxy inverse (Caddy, décrit au Lot 5).
- Secrets uniquement dans les variables d'environnement.
- Vérification du jeton secret du webhook Telegram.
- Limitation du débit par jeune : 20 messages par minute.
- En-têtes de sécurité sur le web : CSP stricte, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Protection CSRF (Server Actions et contrôle de l'en-tête `Origin`).
- Mots de passe hachés avec argon2id.
- Rôles `ADMIN`, `CURATEUR` et `PARTENAIRE` vérifiés côté serveur à chaque action.
- Journal des accès au back-office.

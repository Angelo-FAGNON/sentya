# Sentya : suivi du projet

Dernière mise à jour : 19 novembre 2026.

Ce fichier dit où en est le projet : ce qui est livré, ce qui reste à faire et les points ouverts.
Les consignes de travail sont dans [INSTRUCTIONS.md](INSTRUCTIONS.md).

## État général

- Le MVP est complet côté code : lots 1 à 5 livrés et fusionnés sur `main`.
- La recette manuelle ([docs/RECETTE.md](docs/RECETTE.md)) reste à dérouler et à cocher ligne par ligne.
- Le seed est un jeu de démonstration : toutes les fiches sont au statut `A_VERIFIER` et doivent être validées par un curateur avant tout usage réel.

## Lots

| Lot  | Contenu                                                                           | État             | Commits                                               |
| ---- | --------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------- |
| 1    | Architecture, schéma Prisma                                                       | Livré            | `f5f128b`                                             |
| 2    | Noyau métier (`packages/core`), tests unitaires et d'intégration                  | Livré            | `f5f128b`, `65ec568`                                  |
| Seed | Référentiel de démonstration Bénin et Togo                                        | Livré, à valider | `f2e2f02`                                             |
| 3    | Bot Telegram, moteur de parcours, rappels, tests de bout en bout                  | Livré            | `cfef672`                                             |
| 4    | Site public, back-office (admin, curateur), espace partenaire, lien magique, TOTP | Livré            | `fb1b0c6`, `c9875d6`, `9ef40a5`, `bd78e83`, `8986474` |
| 5    | Docker, déploiement (Caddy), README, checklist de recette, mode sans IA           | Livré            | `b790cc1`                                             |

## Journal

### 19 novembre 2026

- Prompt `choix-pistes@2` : toujours exactement 3 pistes, raison en 20 mots au plus, condition en 15 mots au plus. Garde-fou en code au-delà de 22 et 17 mots. La v1 reste disponible pour expliquer les recommandations passées (`b480883`).
- IA : Claude pour le raisonnement (sorties structurées, CV), Gemini pour l'audio seulement, réunis par `FournisseurComposite`. Sans clé Gemini, le bot demande d'écrire (`3c1d1d6`).
- Corrections de recette : une offre suspendue disparaît de /plan, du PDF et de /monplan ; seed en création seule (ne modifie plus les fiches des curateurs) ; `APP_URL` du bot alignée sur le domaine du site (`c649e34`).
- Recette du site dans Docker et lien magique validés de bout en bout (`0d5bda0`).
- Lot 4 fusionné : site public, back-office et espace partenaire (`8986474`).
- Lot 5 : Docker, déploiement, README, recette, mode sans IA (`b790cc1`).

### 18 novembre 2026

- Lot 3 : bot Telegram, moteur de parcours, rappels et tests de bout en bout (`cfef672`).
- Seed de démonstration Bénin et Togo (`f2e2f02`).
- Lots 1 et 2 : architecture, schéma Prisma, noyau métier et ses tests (`f5f128b`, `65ec568`).

## En cours (non commité)

- `Dockerfile` : cache du magasin pnpm entre les constructions, parallélisme réduit et relances allongées pour les connexions lentes.
- `demo/` : vidéo de présentation de 30 secondes et ses sources. Le dossier est exclu de l'image Docker, d'ESLint et de Prettier.

## À faire

- [ ] Dérouler la recette manuelle complète ([docs/RECETTE.md](docs/RECETTE.md)) : critères CA-1 à CA-9, exigences EF-01 à EF-14, règles RG-01 à RG-12, exigences non fonctionnelles. Noter date, testeur et anomalies.
- [ ] Faire valider le seed par un curateur dans le back-office, fiche par fiche.
- [ ] Confirmer les informations non vérifiées : site de l'AnpE Bénin (anpe.bj), conditions du CQM et du CQP, portail d'inscription de l'ANPE Togo.
- [ ] Vérifier `CLAUDE_MODEL`, `GEMINI_MODEL` et `GEMINI_TTS_MODEL` sur les pages des modèles d'Anthropic et de Google avant le déploiement.
- [ ] Déployer sur le VPS (voir la section « Déployer sur un VPS » du [README](README.md)) et configurer le webhook.

## Points ouverts et limites connues

Détail complet dans la section « Limites connues » du [README](README.md). À reprendre après le MVP :

- **Une seule instance du bot** : limitation du débit et verrou par jeune en mémoire. À déplacer en base pour passer à plusieurs instances.
- **Double authentification** : un code TOTP peut être réutilisé dans sa fenêtre de 30 secondes.
- **Candidatures** : aucune notification par e-mail au partenaire.
- **Pseudonymisation** : un nom propre cité sans contexte peut passer.
- **Hors périmètre du MVP** : WhatsApp (préparé par l'interface `Canal`), langues nationales, mentorat humain, application mobile, paiement.

## Tenir ce fichier à jour

- Ajouter une entrée datée au journal à chaque livraison notable, avec le commit concerné.
- Cocher les lignes de « À faire » une fois faites, et déplacer ce qui est terminé dans le journal.
- Mettre à jour la date en tête du fichier.

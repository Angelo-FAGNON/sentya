# Checklist de recette manuelle

À dérouler sur un environnement lancé avec `docker compose up --build` et un bot Telegram réel.
Cocher chaque ligne, et noter la date, le testeur et toute anomalie.
Renseigner `ANTHROPIC_API_KEY` (Claude) pour le parcours complet, et `GEMINI_API_KEY` pour les vocaux et l'audio.

Pour vérifier la base pendant la recette :

```bash
docker compose exec postgres psql -U sentya -d sentya
```

## 1. Critères d'acceptation

| N    | Critère                                                                                             | Comment vérifier                                                                                                                                                                                                                                                                                                                                                                              | Attendu                                                                                                                          | OK  |
| ---- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --- |
| CA-1 | De /start au plan en moins de 15 minutes, **entièrement en texte**                                  | Chronométrer un parcours complet en répondant par écrit                                                                                                                                                                                                                                                                                                                                       | Plan en 3 étapes reçu en moins de 15 minutes                                                                                     | [ ] |
| CA-2 | De /start au plan en moins de 15 minutes, **entièrement en vocal** (clés Claude et Gemini requises) | Répondre à chaque question par un message vocal                                                                                                                                                                                                                                                                                                                                               | Chaque vocal est compris ; plan reçu en moins de 15 minutes                                                                      | [ ] |
| CA-3 | Aucune piste hors référentiel                                                                       | Après les pistes, comparer `SELECT "metierId" FROM "Piste"` à `SELECT id FROM "Metier"`                                                                                                                                                                                                                                                                                                       | Chaque `metierId` existe dans `Metier`, pour le bon pays                                                                         | [ ] |
| CA-4 | Aucune donnée pratique inventée                                                                     | Comparer chaque contact, coût, durée et adresse du plan à la base                                                                                                                                                                                                                                                                                                                             | Tout vient de la base, ou affiche « À vérifier par le curateur »                                                                 | [ ] |
| CA-5 | /supprimer efface réellement tout                                                                   | `/supprimer`, puis confirmer deux fois. Ensuite : `SELECT count(*) FROM "User"` et le même comptage sur `ConversationState`, `BilanReponse`, `Piste`, `Plan`, `PlanEtape`, `Rappel`                                                                                                                                                                                                           | 0 ligne pour ce jeune                                                                                                            | [ ] |
| CA-6 | 3 signalements suspendent l'opportunité                                                             | Vérifier une opportunité, la faire apparaître dans 3 plans, puis la signaler depuis 3 comptes                                                                                                                                                                                                                                                                                                 | Statut `SUSPENDUE` dès le 3e signalement ; elle n'apparaît plus dans un nouveau plan ; alerte dans le back-office                | [ ] |
| CA-7 | Rappels J+3, J+7 et J+30                                                                            | Automatique : `pnpm --filter @sentya/bot test` (horloge simulée). En réel, après un plan : `UPDATE "Rappel" SET "prevuLe" = (now() AT TIME ZONE 'UTC') - interval '1 minute' WHERE type = 'J3'`, puis `UPDATE pgboss.job SET start_after = now() WHERE name = 'rappel' AND data->>'rappelId' = '<id du rappel>'` (sinon le filet de sécurité l'envoie dans les 15 minutes, entre 8 h et 20 h) | Le message « Cela fait 3 jours » arrive en quelques secondes, une seule fois, avec les boutons de statut ; `envoyeLe` est rempli | [ ] |
| CA-8 | Un curateur met à jour un programme en moins de 5 minutes                                           | Chronométrer : connexion, Programmes, Azôli, modifier le contact, « Marquer comme vérifiée aujourd'hui »                                                                                                                                                                                                                                                                                      | Moins de 5 minutes ; la fiche affiche la nouvelle date de vérification                                                           | [ ] |
| CA-9 | `docker compose up` lance tout, et le seed rend le bot utilisable                                   | Base vide, puis `docker compose up --build`                                                                                                                                                                                                                                                                                                                                                   | Migrations et seed réussis ; le bot répond à /start et propose 3 pistes                                                          | [ ] |

## 2. Exigences fonctionnelles

### EF-01 Accueil et consentement

- [ ] `/start` envoie 3 messages courts, puis les boutons Bénin et Togo.
- [ ] Après le choix du pays : message de consentement avec un lien vers la confidentialité, et les boutons « J'accepte » et « Plus tard ».
- [ ] « Plus tard » : message d'au revoir. `SELECT count(*) FROM "User"` reste à 0.
- [ ] Question d'âge avec les boutons « J'ai 18 ans ou plus » et « J'ai moins de 18 ans ».
- [ ] Moins de 18 ans : message bienveillant avec des ressources générales, et aucun profil créé (RG-02).
- [ ] Avant le clic « J'ai 18 ans ou plus », la base ne contient aucune donnée du jeune (RG-01). Seule `ProcessedUpdate` grandit.

### EF-02 Bilan conversationnel

- [ ] 6 questions, une par message : activités, durée, ce que tu aimes, ville, études (bouton « Pas de diplôme »), objectif.
- [ ] Chaque question accepte le texte ou le vocal.
- [ ] Arrêter au milieu, attendre, puis taper `/start` : « Bon retour ! » et la même question revient.
- [ ] Redémarrer le conteneur du bot au milieu du bilan : la reprise fonctionne.

### EF-03 et EF-04 Compétences et CV

- [ ] Récapitulatif « J'ai repéré ces compétences : ... C'est juste ? » avec les boutons Oui et Corriger.
- [ ] « Corriger », puis « ajoute la coiffure » (texte ou vocal) : la liste est mise à jour.
- [ ] Envoyer un CV en PDF ou en photo à l'étape CV : « J'ai lu ton CV, puis je l'ai supprimé » ; ses compétences s'ajoutent au récapitulatif.
- [ ] Aucun fichier de CV n'est présent sur le disque du conteneur ni en base.

### EF-05 et EF-06 Pistes et fiche

- [ ] « Je réfléchis... » s'affiche, puis 3 pistes en moins de 20 secondes.
- [ ] Chaque piste montre sa voie, une raison qui cite l'expérience, une condition, et « Source : ..., vérifiée le JJ/MM/AAAA » ou « à vérifier ».
- [ ] Une piste issue du repli porte « Piste à explorer ».
- [ ] La fiche montre : description, lieux, durée et coût indicatifs, programmes publics et sources, puis « Choisir cette piste ».

### EF-07 et EF-08 Plan, rappels et suivi

- [ ] Plan en 3 étapes : titre, détails, échéance, source ; boutons Fait, Bloqué, Abandonné.
- [ ] Le PDF du plan arrive dans le chat (moins de 10 Ko).
- [ ] « Bloqué » et « Abandonné » demandent une raison ; le statut est enregistré.
- [ ] `/plan` réaffiche le plan ; `/changer` réaffiche les pistes ; `/recommencer` demande confirmation, puis relance le bilan.

### EF-09 et EF-10 Opportunités et arnaques

- [ ] Une opportunité n'apparaît dans un plan que si elle est `VERIFIEE`, avec « Vérifiée le JJ/MM/AAAA ».
- [ ] Bouton « Signaler » sur l'opportunité ; un motif est demandé.
- [ ] Le même jeune ne compte qu'une fois (« Tu as déjà signalé cette offre »).
- [ ] Une offre soumise avec « frais de dossier » est refusée (RG-05).
- [ ] Une offre avec « contact uniquement par WhatsApp » arrive en brouillon avec une alerte.

### EF-11 Site public et lien magique

- [ ] La page d'accueil pèse moins de 500 Ko (outils du navigateur, onglet Réseau) ; elle montre la promesse, les 3 étapes, le bouton Telegram et le QR code.
- [ ] Les pages confidentialité, conditions et suppression des données sont lisibles et en français simple.
- [ ] `/monplan` envoie un lien. L'ouvrir, puis cliquer « Voir mon plan » : le plan s'affiche.
- [ ] Rouvrir le même lien : « Ce lien a déjà servi ou a expiré ».

### EF-12 Back-office

- [ ] Connexion admin : enrôlement TOTP à la première connexion, puis code obligatoire.
- [ ] Création, modification et suppression pour : compétence, métier (avec compétences et poids), formation, programme, opportunité, modèle d'étape, règle de fraude.
- [ ] Une URL de source vide ou invalide est refusée.
- [ ] File des signalements : « Confirmer la fraude » et « Rejeter le signalement ».
- [ ] Bandeau d'alerte si une opportunité est suspendue depuis plus de 48 heures sans revue (RG-06).
- [ ] Revue qualité : générer l'échantillon de la semaine, puis noter une conversation (pistes correctes, invention détectée).
- [ ] Le tableau de bord affiche les 6 indicateurs.
- [ ] Un curateur n'accède ni à la gestion des comptes ni au journal des accès.

### EF-13 Espace partenaire

- [ ] Inscription d'une organisation : statut « en attente ».
- [ ] Après validation par un admin : publication d'une offre, qui arrive en brouillon (RG-05).
- [ ] Le partenaire ne voit que les candidatures envoyées avec l'accord du jeune, sur ses propres offres (RG-07).

### EF-14 Réponses audio

- [ ] `/parametres`, puis « Activer l'audio » : chaque réponse arrive aussi en message vocal (clé Gemini requise ; sans elle, `/parametres` répond que l'audio n'est pas disponible).

## 3. Règles de gestion

| Règle | Vérification                                                                                                                                                                                                                | OK  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| RG-01 | Avant le consentement, `SELECT count(*) FROM "User"` vaut 0                                                                                                                                                                 | [ ] |
| RG-02 | « J'ai moins de 18 ans » ne crée aucun profil                                                                                                                                                                               | [ ] |
| RG-03 | Toutes les pistes référencent un `Metier` existant ; les compléments sont « à explorer »                                                                                                                                    | [ ] |
| RG-04 | Chaque information affiche sa source et sa date. `UPDATE "Programme" SET statut='VERIFIEE', "verifieLe"=now() - interval '7 months'`, puis lancer la tâche de péremption (ou attendre 2 h) : le statut passe à `A_VERIFIER` | [ ] |
| RG-05 | Seul un curateur peut marquer une offre « Vérifiée » ; une offre qui demande des frais est refusée                                                                                                                          | [ ] |
| RG-06 | 3 signalements suspendent l'offre ; alerte après 48 heures                                                                                                                                                                  | [ ] |
| RG-07 | Le profil n'est envoyé au partenaire qu'après « Oui, envoie », pour cette offre seulement                                                                                                                                   | [ ] |
| RG-08 | Écrire « je suis malade » dans le bilan : la phrase n'est pas enregistrée (`SELECT texte FROM "BilanReponse"`)                                                                                                              | [ ] |
| RG-09 | Les messages ne promettent jamais de résultat et rappellent que la décision appartient au jeune                                                                                                                             | [ ] |
| RG-10 | Aucun paiement n'est demandé dans le parcours                                                                                                                                                                               | [ ] |
| RG-11 | `/supprimer` demande deux confirmations, puis efface tout (voir CA-5)                                                                                                                                                       | [ ] |
| RG-12 | `UPDATE "User" SET "lastActiveAt" = now() - interval '13 months'`, puis lancer la tâche d'anonymisation : `telegramId` et `prenom` sont vides, et `anonymiseLe` est rempli                                                  | [ ] |

## 4. Exigences non fonctionnelles

- [ ] Réponse à un message simple en moins de 5 secondes ; pistes en moins de 20 secondes.
- [ ] Le parcours fonctionne avec une connexion 3G (outils du navigateur de Telegram Web : profil « Slow 3G »).
- [ ] Renvoyer au webhook la même mise à jour (même `update_id`) : elle n'est traitée qu'une fois.
- [ ] Appel du webhook sans le bon en-tête `X-Telegram-Bot-Api-Secret-Token` : réponse 401.
- [ ] Plus de 20 messages en une minute : « Tu vas un peu vite », envoyé une seule fois.
- [ ] En-têtes de sécurité présents sur le site : `curl -I http://localhost:3000` montre CSP, HSTS, X-Frame-Options, Referrer-Policy et Permissions-Policy.
- [ ] Navigation au clavier complète sur le site et le back-office ; focus visible ; contraste suffisant ; zoom à 200 % sans perte.
- [ ] `/health` répond 200 pour le bot (port 8080) et pour le site (`/api/health`).
- [ ] Les journaux (`docker compose logs bot`) ne contiennent ni texte de message, ni identifiant Telegram, ni prénom.
- [ ] `pnpm lint` passe : aucun tiret cadratin ni emoji dans le dépôt.

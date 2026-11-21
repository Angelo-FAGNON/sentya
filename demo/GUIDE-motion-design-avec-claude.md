# Faire du motion design avec Claude Code

Retour d'expérience sur la vidéo de pitch Sentya (60 secondes, 1080p, musique, voix off, QR code),
réalisée entièrement avec Claude Code dans l'application de bureau, sans logiciel de montage.
Ce guide explique la méthode, comment formuler les demandes, et les pièges rencontrés.

Résultat : `demo/sentya-pitch-60s-voix.mp4`. Sources : `demo/source/` (voir son `README.md`).

## 1. Le principe : une vidéo, c'est du code

Claude ne manipule pas After Effects ou Premiere. Il écrit la vidéo comme une page web :

| Étape     | Outil                          | Fichier          |
| --------- | ------------------------------ | ---------------- |
| Minutage  | Un fichier commun image et son | `timeline.js`    |
| Image     | Une page HTML/CSS/JS           | `index.html`     |
| Musique   | Synthèse en JavaScript         | `audio.js`       |
| Capture   | Chrome sans interface          | `render.js`      |
| Encodage  | ffmpeg (H.264 + AAC)           | `render.js`      |
| Voix off  | Piper (hors ligne)             | `voix.js`        |
| QR code   | Bibliothèque `qrcode`          | `qr.js`          |

L'idée clé : **une seule horloge**. La page expose une fonction `render(t)` qui dessine l'image exacte
à l'instant `t`. Le script de rendu appelle `render(0)`, `render(1/30)`, `render(2/30)`… capture chaque image
et l'envoie à ffmpeg. Conséquences :

- le rendu est identique à chaque fois (pas de saccade, pas de dépendance à la vitesse de la machine) ;
- l'image et le son partagent le même minutage (`timeline.js`), donc changer une durée garde tout synchronisé ;
- tout est du texte : on peut modifier, relire, versionner et redemander une correction précise.

## 2. Le déroulé d'une session

1. **Le brief.** Dire à Claude le but, le public, la durée, le format et le ton. Plus le brief est précis,
   moins il y a d'allers-retours.
2. **Le scénario.** Claude propose un découpage scène par scène avec les temps. On valide ou on corrige
   avant qu'il code.
3. **Les images de contrôle.** Avant tout rendu complet (environ 10 minutes), Claude capture quelques images
   fixes à des instants choisis et les regarde :
   ```bash
   node render.js stills ./images 2.6,9.4,13.0,26.8
   ```
4. **Le rendu complet**, lancé en arrière-plan.
5. **La vérification automatique** : durée, format, planche contact (une image toutes les 2 secondes,
   assemblées en grille), lecture du QR code sur la dernière image, mesure du volume sonore.
6. **Les retouches** : on regarde la vidéo, on liste ce qui ne va pas, Claude corrige et relance.
7. **La voix off** en dernier : elle remplace seulement la piste audio, sans refaire l'image (quelques secondes).

## 3. Bien formuler ses demandes

Exemples de demandes qui marchent bien :

- « Fais une vidéo de 60 secondes pour présenter Sentya à un jury de bootcamp. 1080p, musique,
  et un QR code vers le bot à la fin. Utilise les vraies données du seed pour la démo. »
- « À 13 secondes, la bulle du vocal est recouverte par la suivante. Corrige. »
- « Fais aussi une version de 30 secondes. »
- « Ajoute une voix off française, calée sur les scènes. »

Conseils :

- **Donner des repères de temps** (« vers 13 s », « dans la scène Choisis ») plutôt que « au début ».
- **Décrire ce qu'on voit**, pas la solution : « le point d'interrogation passe seul à la ligne »
  suffit, Claude trouve la cause (ici une espace insécable manquante).
- **Fournir les vrais contenus** : logo, couleurs, textes, données. Claude les reprend du code
  du projet s'ils existent (ici la charte de la page d'accueil et les fiches du seed).
- **Demander une planche contact** pour juger toute la vidéo d'un coup d'œil sans la lire.
- **Une retouche à la fois** si elles touchent la même scène, plusieurs à la fois sinon.

## 4. Le son

- **Musique** : générée par code (`audio.js`), donc sans droits d'auteur. Elle suit le tempo du
  minutage (120 BPM, une coupe par temps fort) et se calme sur les scènes plus posées.
- **Voix off** : le texte est écrit segment par segment avec son instant de départ (`voix-off.md`).
  `voix.js` génère chaque phrase, l'accélère légèrement si elle déborde de sa scène (au plus 1,15x),
  baisse la musique pendant que la voix parle, puis normalise le volume (environ -15 LUFS).
- **ElevenLabs** donne une voix bien plus naturelle (il existe des voix françaises à accent africain).
  Claude peut l'utiliser dans son navigateur intégré si on y est connecté, mais l'offre gratuite
  a été bloquée (« activité inhabituelle »). Il faut alors un plan payant, que l'on souscrit soi-même.
- **Piper** est l'alternative gratuite et hors ligne (environ 90 Mo à télécharger). Moins naturel,
  mais correct pour un pitch.

**Important : Claude ne peut pas écouter.** Il vérifie le son par des mesures (niveaux, pics, forme d'onde,
calage), pas à l'oreille. Écoutez toujours le résultat vous-même, idéalement sur les enceintes de la salle.

## 5. Pièges rencontrés et solutions

| Problème                                   | Cause                                       | Solution                                                   |
| ------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------- |
| Rendu interrompu                           | Disque plein (la vidéo fait plus de 100 Mo) | Rendre dans `/tmp`, vérifier l'espace libre avant          |
| « ? » ou « : » seul en début de ligne      | Espace normale avant la ponctuation         | Espace insécable avant `? ! : ;`                           |
| Bulle de chat recouverte                   | Deux animations qui se chevauchent          | Décaler l'entrée de la bulle suivante                      |
| « IA » lu « ya » par la voix               | Le moteur lit le sigle comme un mot         | Écrire « intelligence artificielle » dans le texte lu      |
| Phrase trop longue pour sa scène           | La voix déborde sur la scène suivante       | Raccourcir le texte ou décaler le début du segment         |
| Fichier MP4 refusé par GitHub              | Limite de 100 Mo par fichier                | Ne pas versionner les MP4, ou utiliser Git LFS             |
| Capture d'image qui expire parfois         | Chrome ponctuellement lent                  | Nouvel essai automatique (jusqu'à 3 fois) dans `render.js` |

## 6. Ce que Claude fait seul, et ce qu'il vous demande

Claude avance seul sur le code, les rendus et les vérifications. Il s'arrête et vous demande pour :

- **télécharger des fichiers** (moteur de voix, modèles) : il indique la source et la taille avant ;
- **tout ce qui vous engage personnellement** : cocher une attestation d'âge, accepter des conditions,
  choisir une offre payante, payer ;
- **supprimer des fichiers** (par exemple vider des caches pour libérer de la place) ;
- **commiter ou publier**.

Il ne contourne pas les blocages d'un service (changer de réseau ou de compte pour récupérer un essai gratuit).

## 7. Pour se lancer

1. Ouvrir le projet dans Claude Code (application de bureau, onglet Code).
2. Vérifier que `ffmpeg`, Node.js et Google Chrome sont installés, et qu'il reste au moins 5 Go libres.
3. Donner le brief (section 3), puis valider le scénario avant le code.
4. Repartir de `demo/source/` comme modèle : changer les textes dans `index.html`, les temps dans
   `timeline.js`, puis `npm run build`.

Ordre de grandeur pour cette vidéo : rendu complet en 10 minutes environ,
remplacement de la voix off en quelques secondes.

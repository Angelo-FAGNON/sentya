# Vidéo de démonstration Sentya (pitch, 1 minute)

Sources de la vidéo `demo/sentya-pitch-60s.mp4`, présentée au Tech Builders Bootcamp de l'American Corner d'Abomey-Calavi.

L'animation est une page HTML pilotée par une seule horloge : `render(t)` dessine l'image à l'instant `t`.
Chrome sans interface capture chaque image, puis ffmpeg encode la vidéo avec la musique.
Le résultat est donc identique à chaque rendu.

| Fichier       | Rôle                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `timeline.js` | Minutage commun à l'image et au son (120 BPM, une coupe par temps fort) |
| `index.html`  | Scènes, textes et animation                                              |
| `audio.js`    | Musique et bruitages synthétisés (aucun droit d'auteur), écrit `music.wav` |
| `render.js`   | Capture des images et encodage MP4 (H.264 yuv420p, AAC)                  |
| `qr.js`       | QR code vers le bot, avec le code d'acquisition `pitch`                  |

## Refaire la vidéo

Prérequis : Node.js 22, ffmpeg, Google Chrome (chemin modifiable avec `CHROME_PATH`).

```bash
cd demo/source && npm install
```

```bash
npm run build
```

Le rendu prend environ 10 minutes et remplace `demo/sentya-pitch-60s.mp4`.

Pour contrôler une scène sans tout rendre, capturer quelques images :

```bash
node render.js stills ./images 2.6,9.4,13.0,26.8
```

## Modifier un texte

Les textes sont dans `index.html`. Pour changer un minutage, modifier `timeline.js`,
puis relancer `npm run build` : l'image et le son restent synchronisés.

Le dossier `demo/` est exclu d'ESLint et de Prettier.

## Déroulé

| Temps     | Scène                                                                    |
| --------- | ------------------------------------------------------------------------ |
| 0 à 8 s   | « Je fais quoi de ma vie ? », puis les trois problèmes                   |
| 8 à 10 s  | Logo                                                                     |
| 10 à 35 s | Démo dans Telegram : Raconte (vocal, CV), Choisis (3 pistes), Avance     |
| 35 à 42 s | Derrière l'écran : curateurs, vocal, 3G, données protégées               |
| 42 à 49 s | Promesse : 15 minutes, 3 pistes sourcées, 3 étapes, gratuit              |
| 49 à 60 s | Phrase finale, logo et QR code vers le bot                               |

Le QR code ouvre `https://t.me/SentyaOrientationBot?start=pitch` : les inscriptions venues du pitch
apparaissent sous le canal `pitch` dans l'indicateur « nouveaux utilisateurs par canal ».

La version de 30 secondes (`demo/sentya-pitch-30s.mp4`) a été produite par une version antérieure de ces sources.

## Voix off

Le texte est dans `voix-off.md`. La version finale `demo/sentya-pitch-60s-voix.mp4` utilise
[Piper](https://github.com/rhasspy/piper) (synthèse vocale libre, hors ligne) avec la voix française `fr_FR-siwis-medium`.
`voix.js` génère chaque segment, l'accélère si besoin (au plus 1,15x) pour tenir dans sa scène,
baisse la musique sous la voix, puis remplace la piste audio sans refaire l'image :

```bash
PIPER_BIN=/chemin/piper PIPER_VOICE=/chemin/fr_FR-siwis-medium.onnx node voix.js ../sentya-pitch-60s.mp4 ../sentya-pitch-60s-voix.mp4
```

Piper tire légèrement au hasard l'intonation : deux générations ne sont pas identiques au bit près.

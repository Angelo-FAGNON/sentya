// Voix off locale avec Piper (synthese vocale hors ligne), puis mixage avec la musique.
// Usage : PIPER_BIN=/chemin/piper PIPER_VOICE=/chemin/fr_FR-siwis-medium.onnx node voix.js ../sentya-pitch-60s.mp4 ../sentya-pitch-60s-voix.mp4
// Chaque segment est genere seul, accelere si besoin pour tenir dans sa scene, puis place a son instant.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PIPER = process.env.PIPER_BIN, VOICE = process.env.PIPER_VOICE;
if (!PIPER || !VOICE) throw new Error("Definir PIPER_BIN et PIPER_VOICE");
const [videoIn, videoOut] = process.argv.slice(2).map((p) => path.resolve(p));
const TMP = path.join(__dirname, "voix-tmp");
fs.mkdirSync(TMP, { recursive: true });

// [debut, fin maximale, texte]. "IA" est ecrit en toutes lettres : Piper le lirait "ya".
const SEGMENTS = [
  [0.4, 4.2, "Au Bénin et au Togo, une question revient : je fais quoi de ma vie ?"],
  [4.3, 8.15, "Peu de conseillers, des infos éparpillées, et des fausses offres qui coûtent cher."],
  [8.1, 11.25, "Voici Sentya, ton conseiller d'orientation sur Telegram."],
  [11.3, 19.2, "Le jeune raconte ce qu'il sait faire, par écrit ou par vocal. Sentya repère ses compétences, lit son CV, puis le supprime."],
  [19.4, 26.6, "Il reçoit trois pistes réalistes, justifiées et sourcées. Et c'est lui qui choisit."],
  [26.8, 34.6, "Puis un plan en trois étapes, des offres vérifiées, et des rappels pour ne pas lâcher."],
  [35.3, 42.85, "Derrière l'écran, une intelligence artificielle qui conseille, et des humains qui vérifient chaque fiche."],
  [43.0, 44.25, "Moins de quinze minutes."],
  [44.3, 45.55, "Trois pistes sourcées."],
  [45.6, 46.85, "Un plan en trois étapes."],
  [46.9, 49.4, "Et c'est gratuit pour le jeune."],
  [49.7, 53.5, "De, je ne sais pas, à, je sais quoi faire."],
  [54.0, 58.5, "Sentya. Scanne, et raconte."],
];

const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
function synth(text, scale, out) {
  execFileSync(PIPER, ["--model", VOICE, "--output_file", out, "--length_scale", String(scale), "--sentence_silence", "0.22"], { input: text, stdio: ["pipe", "ignore", "ignore"] });
  // retire les silences de debut et de fin
  const trimmed = out.replace(".wav", "-t.wav");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", out, "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", trimmed]);
  return trimmed;
}

const placed = [];
SEGMENTS.forEach(([t0, t1, text], i) => {
  const win = t1 - t0;
  let scale = 0.94;
  let f = synth(text, scale, path.join(TMP, `s${i}.wav`));
  let d = dur(f);
  // deux passes : la duree ne suit pas exactement la vitesse (pauses fixes entre les phrases)
  for (let k = 0; k < 2 && d > win; k++) {
    scale = Math.max(0.86, scale * (win / d) * 0.97); // au plus 1,15x : la diction reste naturelle
    f = synth(text, scale, path.join(TMP, `s${i}.wav`));
    d = dur(f);
  }
  console.log(`${String(i + 1).padStart(2)}  ${t0.toFixed(2)}s  ${d.toFixed(2)}s / ${win.toFixed(2)}s  vitesse ${(1 / scale).toFixed(2)}x  ${d > win ? "TROP LONG" : "ok"}`);
  placed.push({ f, t0 });
});

// Piste voix : traitement (coupe-bas, presence, compression legere), chaque segment a son instant.
const voice = path.join(TMP, "voix.wav");
const inputs = placed.flatMap((p) => ["-i", p.f]);
const delays = placed.map((p, i) => `[${i}]adelay=${Math.round(p.t0 * 1000)}|${Math.round(p.t0 * 1000)},aformat=channel_layouts=stereo[v${i}]`).join(";");
const mixIn = placed.map((_, i) => `[v${i}]`).join("");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex",
  `${delays};${mixIn}amix=inputs=${placed.length}:normalize=0,highpass=f=90,equalizer=f=3000:t=q:w=1:g=3,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,apad=whole_dur=60[out]`,
  "-map", "[out]", "-ar", "44100", "-t", "60", voice]);

// Mixage final : la musique baisse sous la voix (compression declenchee par la voix), puis normalisation.
const music = path.join(__dirname, "music.wav");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", videoIn, "-i", music, "-i", voice, "-filter_complex",
  "[1]volume=0.55[m];[2]asplit[vs][vm];[m][vs]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=350[md];" +
  "[md][vm]amix=inputs=2:normalize=0:weights=1 1.6,loudnorm=I=-15:TP=-1.5:LRA=11[a]",
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-t", "60", "-movflags", "+faststart", videoOut]);
console.log("Video avec voix :", videoOut);

// Conversion du PCM produit par la synthèse vocale en OGG/Opus, format des messages
// vocaux Telegram. Utilise ffmpeg (installé dans l'image Docker du bot).
import { spawn } from "node:child_process";

export function convertirPcmEnOgg(pcm: Buffer, frequence: number): Promise<Buffer> {
  return new Promise((resoudre, rejeter) => {
    const ffmpeg = spawn(
      "ffmpeg",
      [
        "-loglevel",
        "error",
        "-f",
        "s16le",
        "-ar",
        String(frequence),
        "-ac",
        "1",
        "-i",
        "pipe:0",
        "-c:a",
        "libopus",
        "-b:a",
        "24k",
        "-f",
        "ogg",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const morceaux: Buffer[] = [];
    let erreurs = "";
    const minuterie = setTimeout(() => ffmpeg.kill("SIGKILL"), 20_000);
    ffmpeg.stdout.on("data", (m: Buffer) => morceaux.push(m));
    ffmpeg.stderr.on("data", (m: Buffer) => (erreurs += m.toString()));
    ffmpeg.on("error", (e) => {
      clearTimeout(minuterie);
      rejeter(e);
    });
    ffmpeg.on("close", (code) => {
      clearTimeout(minuterie);
      if (code === 0) resoudre(Buffer.concat(morceaux));
      else rejeter(new Error(`ffmpeg a echoue (code ${code}) : ${erreurs.slice(0, 200)}`));
    });
    ffmpeg.stdin.end(pcm);
  });
}

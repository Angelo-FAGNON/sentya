// Usage : node render.js stills <dossier> t1,t2,...   |   node render.js video sortie.mp4 [ips]
const puppeteer = require("puppeteer-core");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const TL = require("./timeline.js");
(async () => {
  const mode = process.argv[2];
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", headless: true,
    args: ["--allow-file-access-from-files", "--force-color-profile=srgb", "--hide-scrollbars"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("file://" + path.join(__dirname, "index.html"), { waitUntil: "load" });
  await page.evaluate(() => window.__ready);
  // Une capture peut expirer de temps en temps : on la retente jusqu'a 3 fois.
  const shot = async (t, type = "png") => {
    for (let essai = 1; ; essai++) {
      try {
        await page.evaluate((t) => window.render(t), t);
        return await page.screenshot({ type, quality: type === "jpeg" ? 95 : undefined, optimizeForSpeed: true });
      } catch (e) {
        if (essai >= 3) throw e;
        console.log(`capture t=${t.toFixed(2)} : nouvel essai (${e.message})`);
      }
    }
  };
  if (mode === "stills") {
    const dir = process.argv[3]; fs.mkdirSync(dir, { recursive: true });
    for (const t of process.argv[4].split(",").map(Number)) fs.writeFileSync(path.join(dir, `s_${t.toFixed(2)}.png`), await shot(t));
  } else {
    const cible = path.resolve(process.argv[3]); const out = cible.replace(/\.mp4$/, ".partiel.mp4"); const fps = Number(process.argv[4] || TL.FPS);
    const N = Math.round(TL.DUR * fps);
    // Images JPEG en entree, musique.wav en piste audio, sortie H.264 yuv420p (lisible partout).
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-i", path.join(__dirname, "music.wav"), "-map", "0:v", "-map", "1:a",
      "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
      "-profile:v", "high", "-level", "4.1", "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-c:a", "aac", "-b:a", "192k", "-r", String(fps), "-t", String(TL.DUR), "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      const buf = await shot(i / fps, "jpeg");
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 90 === 0) console.log(`frame ${i}/${N} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    const code = await new Promise((r) => ff.on("close", r));
    if (code !== 0) throw new Error(`ffmpeg a echoue (code ${code})`);
    // On ne remplace la video qu'une fois le rendu complet.
    fs.renameSync(out, cible);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

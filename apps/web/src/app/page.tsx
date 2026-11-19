// Page d'accueil : la promesse, les 3 étapes, le bouton Telegram et le code QR.
// Aucune image lourde : le code QR est un SVG généré côté serveur.
import QRCode from "qrcode";
import { CadrePublic } from "@/composants/cadre-public";
import { env } from "@/env";
import { lienTelegram } from "@/lib/telegram";
import { accueil, PROMESSE } from "@/lib/textes-publics";

export default async function Accueil() {
  const { TELEGRAM_BOT_USERNAME } = env();
  const lienBouton = lienTelegram(TELEGRAM_BOT_USERNAME, "site");
  const lienQr = lienTelegram(TELEGRAM_BOT_USERNAME, "qr");
  const svgQr = await QRCode.toString(lienQr, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <CadrePublic>
      <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{accueil.titre}</h1>
      <p className="mt-4 text-xl">{PROMESSE}</p>

      <section aria-labelledby="titre-etapes" className="mt-10">
        <h2 id="titre-etapes" className="text-2xl font-semibold">
          Comment ça marche
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {accueil.etapes.map((etape, index) => (
            <li key={etape.nom} className="rounded border border-slate-300 p-4">
              <p className="text-lg font-bold text-emerald-900">
                {index + 1}. {etape.nom}
              </p>
              <p className="mt-2">{etape.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="titre-gratuit" className="mt-10">
        <h2 id="titre-gratuit" className="text-2xl font-semibold">
          C&apos;est gratuit
        </h2>
        <p className="mt-2">{accueil.gratuit}</p>
        <p className="mt-2">{accueil.pays}</p>
      </section>

      <p className="mt-8">
        <a href={lienBouton} className="bouton px-6 py-3 text-lg" rel="noopener">
          {accueil.bouton}
        </a>
      </p>

      <section aria-labelledby="titre-qr" className="mt-10">
        <h2 id="titre-qr" className="text-xl font-semibold">
          {accueil.qrTitre}
        </h2>
        <figure className="mt-4">
          <div
            role="img"
            aria-label="Code QR pour ouvrir Sentya dans Telegram"
            className="h-48 w-48 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svgQr }}
          />
          <figcaption className="mt-2 text-sm">
            {accueil.qrAlternative} <a href={lienQr}>{lienQr}</a>.
          </figcaption>
        </figure>
      </section>
    </CadrePublic>
  );
}

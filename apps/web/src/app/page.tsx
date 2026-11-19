// Page d'accueil : la promesse, l'exemple de conversation, les 3 étapes, la confiance,
// le code QR et les questions. Aucune image : le code QR est un SVG généré côté serveur.
import QRCode from "qrcode";
import { CadrePublic } from "@/composants/cadre-public";
import { ConversationExemple } from "@/composants/conversation-exemple";
import { Icone, type NomIcone } from "@/composants/icones";
import { env } from "@/env";
import { lienTelegram } from "@/lib/telegram";
import { accueil, conversationExemple, PROMESSE } from "@/lib/textes-publics";

const ICONES_ETAPES: NomIcone[] = ["micro", "source", "cloche"];
const ICONES_GARANTIES: NomIcone[] = ["personne", "verifie", "cadenas", "alerte"];

export default async function Accueil() {
  const { TELEGRAM_BOT_USERNAME } = env();
  const lienBouton = lienTelegram(TELEGRAM_BOT_USERNAME, "site");
  const lienQr = lienTelegram(TELEGRAM_BOT_USERNAME, "qr");
  const svgQr = await QRCode.toString(lienQr, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b1733", light: "#ffffff" },
  });

  return (
    <CadrePublic pleineLargeur>
      <section className="heros" aria-labelledby="titre">
        <div className="conteneur heros-grille">
          <div className="heros-texte">
            <h1 id="titre">
              {accueil.titre.avant} <span className="surligne">{accueil.titre.surligne}</span>
              {accueil.titre.apres}
            </h1>
            <p className="promesse">{PROMESSE}</p>
            <div className="action">
              <div className="boutons">
                <a className="cta" href={lienBouton} rel="noopener">
                  <Icone nom="avion" />
                  {accueil.bouton}
                </a>
                <span className="bientot">
                  <Icone nom="horloge" />
                  {accueil.bientotWhatsapp}
                </span>
              </div>
              <ul className="faits" aria-label="En bref">
                {accueil.faits.map((fait) => (
                  <li key={fait}>
                    <Icone nom="coche" />
                    {fait}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ConversationExemple messages={conversationExemple} textes={accueil.exemple} />
        </div>
      </section>

      <section className="section" aria-labelledby="titre-etapes">
        <div className="conteneur marche">
          <div className="intro">
            <h2 id="titre-etapes">{accueil.etapesTitre}</h2>
            <p className="chapeau">{accueil.etapesChapeau}</p>
          </div>
          <ol className="chemin">
            {accueil.etapes.map((etape, index) => (
              <li key={etape.nom} className="etape">
                <span className="pastille" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3>{etape.nom}</h3>
                  <p>{etape.texte}</p>
                  <span className="detail">
                    <Icone nom={ICONES_ETAPES[index] ?? "coche"} />
                    {etape.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="confiance" aria-labelledby="titre-gratuit">
        <div className="conteneur">
          <h2 id="titre-gratuit">{accueil.gratuitTitre}</h2>
          <p className="gros">{accueil.gratuit}</p>
          <ul className="garanties">
            {accueil.garanties.map((garantie, index) => (
              <li key={garantie.titre}>
                <Icone nom={ICONES_GARANTIES[index] ?? "coche"} />
                <div>
                  <strong>{garantie.titre}</strong>
                  <p>{garantie.texte}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="titre-qr">
        <div className="conteneur">
          <figure className="qr-bloc">
            <div className="qr-cadre">
              <div
                role="img"
                aria-label="Code QR pour ouvrir Sentya dans Telegram"
                dangerouslySetInnerHTML={{ __html: svgQr }}
              />
            </div>
            <div>
              <h2 id="titre-qr">{accueil.qrTitre}</h2>
              <figcaption>
                {accueil.qrAlternative} <a href={lienQr}>{lienQr}</a>.
              </figcaption>
            </div>
          </figure>
        </div>
      </section>

      <section className="section section-serree" aria-labelledby="titre-questions">
        <div className="conteneur faq">
          <div>
            <h2 id="titre-questions">{accueil.questionsTitre}</h2>
            <p className="chapeau">{accueil.questionsChapeau}</p>
          </div>
          <div className="questions">
            {accueil.questions.map((q, index) => (
              <details key={q.question}>
                <summary>
                  {q.question}
                  <Icone nom="plus" />
                </summary>
                <p>
                  {q.reponse}
                  {index === accueil.questions.length - 1 ? (
                    <>
                      {" "}
                      <a href="/suppression">{accueil.enSavoirPlus}</a>.
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final" aria-labelledby="titre-final">
        <div className="conteneur">
          <h2 id="titre-final">{accueil.finalTitre}</h2>
          <p>{accueil.finalTexte}</p>
          <a className="cta" href={lienBouton} rel="noopener">
            <Icone nom="avion" />
            {accueil.bouton}
          </a>
        </div>
      </section>
    </CadrePublic>
  );
}

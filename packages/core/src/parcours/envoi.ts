// Envoi des réponses d'un tour de conversation. Les textes sont gardés pour la réponse
// audio (EF-14), envoyée en plus du texte quand le jeune l'a demandé.
import type { Canal, OptionsEnvoi } from "../canal/canal";
import { verifierBoutons } from "../canal/canal";
import type { FournisseurIA } from "../ia/fournisseur";
import type { Journal } from "../journal";

/** Longueur maximale lue en audio : au-delà, la réponse vocale serait trop lourde en 3G. */
const LONGUEUR_AUDIO_MAX = 700;

export class Envoi {
  readonly textes: string[] = [];

  constructor(
    private readonly canal: Canal,
    readonly destinataire: string,
  ) {}

  async texte(texte: string, options?: OptionsEnvoi): Promise<void> {
    verifierBoutons(options?.boutons);
    await this.canal.envoyerTexte(this.destinataire, texte, options);
    this.textes.push(texte);
  }

  async serie(liste: readonly string[]): Promise<void> {
    for (const t of liste) await this.texte(t);
  }

  async document(contenu: Buffer, nomFichier: string, legende?: string): Promise<void> {
    await this.canal.envoyerDocument(this.destinataire, contenu, nomFichier, legende);
  }

  async activite(): Promise<void> {
    await this.canal.indiquerActivite(this.destinataire).catch(() => undefined);
  }
}

/** Texte lu à voix haute : sans liens ni lignes de source, tronqué. */
export function texteAudio(textes: string[]): string {
  const lignes = textes
    .join("\n")
    .split("\n")
    .filter((l) => !/^Source :|https?:\/\//.test(l.trim()));
  const texte = lignes.join(" ").replace(/\s+/g, " ").trim();
  return texte.length > LONGUEUR_AUDIO_MAX ? `${texte.slice(0, LONGUEUR_AUDIO_MAX)}...` : texte;
}

/** Envoie la version audio des textes du tour. Une erreur n'interrompt jamais le parcours. */
export async function envoyerAudio(options: {
  ia: FournisseurIA;
  canal: Canal;
  destinataire: string;
  textes: string[];
  convertirVoix: (pcm: Buffer, frequence: number) => Promise<Buffer>;
  journal: Journal;
}): Promise<void> {
  const texte = texteAudio(options.textes);
  if (!texte) return;
  try {
    const audio = await options.ia.synthetiserVoix(texte, 15_000);
    const ogg = await options.convertirVoix(audio.pcm, audio.frequence);
    await options.canal.envoyerVocal(options.destinataire, ogg);
  } catch (erreur) {
    options.journal.warn({ erreur: (erreur as Error).message }, "reponse audio non envoyee");
  }
}

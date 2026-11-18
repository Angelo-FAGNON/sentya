// Implémentation Telegram de l'interface Canal du noyau.
import type { Api } from "grammy";
import { InlineKeyboard, InputFile } from "grammy";
import type { Canal, FichierEntrant, OptionsEnvoi } from "@sentya/core";
import { FICHIER_OCTETS_MAX } from "@sentya/core";

export type Telechargeur = (cheminFichier: string) => Promise<Buffer>;

/** Téléchargement réel depuis les serveurs de fichiers de Telegram. */
export function telechargeurTelegram(jeton: string): Telechargeur {
  return async (cheminFichier) => {
    const reponse = await fetch(`https://api.telegram.org/file/bot${jeton}/${cheminFichier}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!reponse.ok)
      throw new Error(`Telechargement Telegram impossible (HTTP ${reponse.status}).`);
    const donnees = Buffer.from(await reponse.arrayBuffer());
    if (donnees.byteLength > FICHIER_OCTETS_MAX) throw new Error("Fichier trop lourd.");
    return donnees;
  };
}

export class TelegramCanal implements Canal {
  readonly nom = "TELEGRAM" as const;

  constructor(
    private readonly api: Api,
    private readonly telecharger: Telechargeur,
  ) {}

  async envoyerTexte(destinataire: string, texte: string, options?: OptionsEnvoi): Promise<void> {
    let clavier: InlineKeyboard | undefined;
    if (options?.boutons?.length || options?.lien) {
      clavier = new InlineKeyboard();
      // Un bouton par ligne : plus lisible sur petit écran.
      for (const bouton of options.boutons ?? []) clavier.text(bouton.libelle, bouton.action).row();
      if (options.lien) clavier.url(options.lien.libelle, options.lien.url).row();
    }
    await this.api.sendMessage(destinataire, texte, {
      reply_markup: clavier,
      link_preview_options: { is_disabled: true },
    });
  }

  async envoyerVocal(destinataire: string, audioOggOpus: Buffer): Promise<void> {
    await this.api.sendVoice(destinataire, new InputFile(audioOggOpus, "reponse.ogg"));
  }

  async envoyerDocument(
    destinataire: string,
    contenu: Buffer,
    nomFichier: string,
    legende?: string,
  ): Promise<void> {
    await this.api.sendDocument(destinataire, new InputFile(contenu, nomFichier), {
      caption: legende,
    });
  }

  async indiquerActivite(destinataire: string): Promise<void> {
    await this.api.sendChatAction(destinataire, "typing");
  }

  async telechargerFichier(
    fichier: FichierEntrant,
  ): Promise<{ donnees: Buffer; mimeType: string }> {
    const infos = await this.api.getFile(fichier.reference);
    if (!infos.file_path) throw new Error("Chemin de fichier absent.");
    if ((infos.file_size ?? 0) > FICHIER_OCTETS_MAX) throw new Error("Fichier trop lourd.");
    return { donnees: await this.telecharger(infos.file_path), mimeType: fichier.mimeType };
  }
}

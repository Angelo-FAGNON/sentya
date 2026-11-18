// Traduction d'une mise à jour Telegram en message entrant normalisé du noyau.
import type { Context } from "grammy";
import type { MessageEntrant } from "@sentya/core";

export interface EntreeTelegram {
  idCanal: string;
  prenomCanal: string | null;
  message: MessageEntrant;
}

export function convertirMiseAJour(ctx: Context): EntreeTelegram | null {
  const auteur = ctx.from;
  if (!auteur || auteur.is_bot) return null;
  // Sentya ne répond qu'en conversation privée.
  if (ctx.chat && ctx.chat.type !== "private") return null;

  const base = { idCanal: String(auteur.id), prenomCanal: auteur.first_name ?? null };

  if (ctx.callbackQuery) {
    const action = ctx.callbackQuery.data;
    return action ? { ...base, message: { type: "action", action } } : null;
  }

  const message = ctx.message;
  if (!message) return null;

  if (message.text) {
    const texte = message.text.trim();
    const commande = /^\/([a-z_]+)(?:@\w+)?(?:\s+(.+))?$/i.exec(texte);
    if (commande?.[1]) {
      return {
        ...base,
        message: {
          type: "commande",
          commande: commande[1].toLowerCase(),
          argument: commande[2]?.trim(),
        },
      };
    }
    return { ...base, message: { type: "texte", texte } };
  }
  if (message.voice) {
    return {
      ...base,
      message: {
        type: "vocal",
        fichier: {
          reference: message.voice.file_id,
          mimeType: message.voice.mime_type ?? "audio/ogg",
          tailleOctets: message.voice.file_size,
          dureeSecondes: message.voice.duration,
        },
      },
    };
  }
  if (message.audio) {
    return {
      ...base,
      message: {
        type: "vocal",
        fichier: {
          reference: message.audio.file_id,
          mimeType: message.audio.mime_type ?? "audio/mpeg",
          tailleOctets: message.audio.file_size,
          dureeSecondes: message.audio.duration,
        },
      },
    };
  }
  if (message.document) {
    return {
      ...base,
      message: {
        type: "document",
        fichier: {
          reference: message.document.file_id,
          mimeType: message.document.mime_type ?? "application/octet-stream",
          tailleOctets: message.document.file_size,
        },
      },
    };
  }
  if (message.photo && message.photo.length > 0) {
    const grande = message.photo[message.photo.length - 1];
    if (!grande) return null;
    return {
      ...base,
      message: {
        type: "photo",
        fichier: {
          reference: grande.file_id,
          mimeType: "image/jpeg",
          tailleOctets: grande.file_size,
        },
      },
    };
  }
  return { ...base, message: { type: "autre" } };
}

// Outils du test de bout en bout : faux Telegram (appels API interceptés), IA factice,
// planificateur factice, horloge simulée et base PostgreSQL réelle.
import type { UserFromGetMe } from "grammy/types";
import { journalSilencieux, type Planificateur } from "@sentya/core";
import { creerBot } from "../src/bot";
import { generateurPdfPlan } from "../src/pdf/plan-pdf";
import { TelegramCanal } from "../src/telegram-canal";
import {
  contexteTest,
  prismaTest,
  repondeurDeterministe,
} from "../../../packages/core/test/outils/base";

export const ID_JEUNE = 424242;

export class PlanificateurFactice implements Planificateur {
  readonly rappels: { id: string; prevuLe: Date }[] = [];
  readonly reprises: { userId: string; tentative: number; delaiSecondes: number }[] = [];
  async programmerRappels(rappels: { id: string; prevuLe: Date }[]) {
    this.rappels.push(...rappels);
  }
  async programmerReprise(userId: string, tentative: number, delaiSecondes: number) {
    this.reprises.push({ userId, tentative, delaiSecondes });
  }
}

export interface AppelApi {
  methode: string;
  charge: Record<string, unknown>;
}

const INFOS_BOT = {
  id: 1,
  is_bot: true,
  first_name: "Sentya",
  username: "SentyaTestBot",
  can_join_groups: false,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
} as unknown as UserFromGetMe;

/** IA factice : transcription, extraction, correction et choix de pistes déterministes. */
export function repondeurParcours(
  requete: { version: string; texte: string },
  _numero?: number,
): unknown {
  if (requete.version.startsWith("transcription@")) {
    return {
      texte: "Je couds des habits depuis trois ans et je vends au marché.",
      inaudible: false,
    };
  }
  if (requete.version.startsWith("extraction-competences@")) {
    return {
      competences: [
        { id: "couture", preuve: "je couds des habits" },
        { id: "vente", preuve: "je vends au marché" },
      ],
      activites: [{ libelle: "couture de vêtements", dureeMois: 36 }],
    };
  }
  if (requete.version.startsWith("correction-competences@")) {
    return { ajouter: ["coiffure"], retirer: [] };
  }
  return repondeurDeterministe(requete);
}

export function creerEnvironnement(
  repondeur: (r: { version: string; texte: string }, n: number) => unknown = repondeurParcours,
) {
  const prisma = prismaTest();
  const { ctx, ia, horloge } = contexteTest(repondeur);
  const planificateur = new PlanificateurFactice();
  const appels: AppelApi[] = [];

  const { bot, deps } = creerBot({
    jeton: "123456:TEST-JETON-FACTICE-POUR-LES-TESTS",
    prisma,
    journal: journalSilencieux,
    configBot: { botInfo: INFOS_BOT },
    dependances: (b) => ({
      ctx,
      canal: new TelegramCanal(b.api, async () => Buffer.from("OggS-audio-factice")),
      planificateur,
      urlConfidentialite: "https://sentya.test/confidentialite",
      genererPdfPlan: generateurPdfPlan(prisma),
      convertirVoix: async () => Buffer.from("OggS"),
    }),
  });

  let numeroMessage = 1000;
  bot.api.config.use(async (_precedent, methode, charge) => {
    appels.push({ methode, charge: charge as Record<string, unknown> });
    let resultat: unknown = true;
    if (methode.startsWith("send")) {
      resultat = {
        message_id: numeroMessage++,
        date: 0,
        chat: { id: ID_JEUNE, type: "private", first_name: "Afi" },
      };
    } else if (methode === "getFile") {
      resultat = { file_id: "f", file_unique_id: "u", file_size: 2048, file_path: "voice/f.ogg" };
    }
    return { ok: true, result: resultat } as never;
  });

  let updateId = 1;
  const auteur = { id: ID_JEUNE, is_bot: false, first_name: "Afi" };
  const chat = { id: ID_JEUNE, type: "private" as const, first_name: "Afi" };

  const envoyer = (update: Record<string, unknown>) =>
    bot.handleUpdate({ update_id: updateId++, ...update } as never);

  const jeune = {
    ecrit: (texte: string) =>
      envoyer({ message: { message_id: updateId, date: 0, chat, from: auteur, text: texte } }),
    appuie: (action: string) =>
      envoyer({
        callback_query: {
          id: String(updateId),
          from: auteur,
          chat_instance: "c",
          data: action,
          message: { message_id: 1, date: 0, chat, text: "x" },
        },
      }),
    parle: () =>
      envoyer({
        message: {
          message_id: updateId,
          date: 0,
          chat,
          from: auteur,
          voice: {
            file_id: "voix",
            file_unique_id: "v",
            duration: 8,
            mime_type: "audio/ogg",
            file_size: 2048,
          },
        },
      }),
    /** Rejoue exactement la même mise à jour (même update_id). */
    rejoue: (update: Record<string, unknown>) => bot.handleUpdate(update as never),
  };

  /** Textes envoyés au jeune depuis le dernier appel. */
  let curseur = 0;
  const nouveauxMessages = () => {
    const nouveaux = appels.slice(curseur);
    curseur = appels.length;
    return nouveaux.filter((a) => a.methode === "sendMessage").map((a) => a.charge);
  };
  const textes = (messages: Record<string, unknown>[]) => messages.map((m) => String(m.text));
  const boutons = (
    message: Record<string, unknown> | undefined,
  ): { text: string; callback_data?: string; url?: string }[] =>
    (
      (
        message?.reply_markup as
          | { inline_keyboard?: { text: string; callback_data?: string; url?: string }[][] }
          | undefined
      )?.inline_keyboard ?? []
    ).flat();

  return {
    prisma,
    ctx,
    ia,
    horloge,
    planificateur,
    appels,
    bot,
    deps,
    jeune,
    nouveauxMessages,
    textes,
    boutons,
  };
}

export type Environnement = ReturnType<typeof creerEnvironnement>;

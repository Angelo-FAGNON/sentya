// Client Gemini (SDK officiel @google/genai), utilisé pour l'audio seulement :
// transcription des vocaux et synthèse vocale (Claude ne lit pas l'audio).
// - Sortie JSON structurée : responseMimeType + responseJsonSchema.
// - Entrées audio (ogg/opus de Telegram), PDF et images envoyées directement au modèle.
// - Synthèse vocale par le modèle TTS : sortie PCM 16 bits, convertie en OGG par le bot.
import { ApiError, GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import {
  IAIndisponibleError,
  SortieIAInvalideError,
  type AudioSynthetise,
  type FournisseurIA,
  type RequeteJson,
} from "./fournisseur";

/** Codes HTTP qui signalent une indisponibilité temporaire (à réessayer plus tard). */
const STATUTS_TEMPORAIRES = new Set([408, 429, 500, 502, 503, 504]);

export interface OptionsGemini {
  apiKey: string;
  modele: string;
  modeleVoix: string;
  /** Voix prédéfinie de Gemini pour la synthèse (EF-14). */
  voix?: string;
}

/** Classe une erreur du SDK : indisponibilité (on réessaie plus tard) ou réponse invalide. */
export function classerErreurGemini(erreur: unknown): Error {
  if (erreur instanceof ApiError) {
    if (STATUTS_TEMPORAIRES.has(erreur.status)) {
      return new IAIndisponibleError(`Gemini indisponible (HTTP ${erreur.status}).`, {
        cause: erreur,
      });
    }
    return new SortieIAInvalideError(`Requete refusee par Gemini (HTTP ${erreur.status}).`, {
      cause: erreur,
    });
  }
  if (erreur instanceof Error) {
    const nom = erreur.name;
    const message = erreur.message.toLowerCase();
    if (
      nom === "AbortError" ||
      nom === "TimeoutError" ||
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("econn") ||
      message.includes("etimedout")
    ) {
      return new IAIndisponibleError("Gemini injoignable ou trop lent.", { cause: erreur });
    }
  }
  return new IAIndisponibleError("Erreur inattendue lors de l'appel a Gemini.", { cause: erreur });
}

export class FournisseurGemini implements FournisseurIA {
  readonly modele: string;
  private readonly client: GoogleGenAI;
  private readonly modeleVoix: string;
  private readonly voix: string;

  constructor(options: OptionsGemini) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
    this.modele = options.modele;
    this.modeleVoix = options.modeleVoix;
    this.voix = options.voix ?? "Kore";
  }

  async genererJson(requete: RequeteJson): Promise<unknown> {
    const parties: Part[] = [{ text: requete.texte }];
    if (requete.media) {
      parties.push({
        inlineData: {
          mimeType: requete.media.mimeType,
          data: requete.media.donnees.toString("base64"),
        },
      });
    }

    let texte: string | undefined;
    try {
      const reponse = await this.client.models.generateContent({
        model: this.modele,
        contents: [{ role: "user", parts: parties }],
        config: {
          systemInstruction: requete.systeme,
          responseMimeType: "application/json",
          responseJsonSchema: requete.schemaJson,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: AbortSignal.timeout(requete.delaiMs),
        },
      });
      texte = reponse.text;
    } catch (erreur) {
      throw classerErreurGemini(erreur);
    }

    if (!texte) {
      throw new SortieIAInvalideError("Reponse vide de Gemini.");
    }
    try {
      return JSON.parse(texte) as unknown;
    } catch (erreur) {
      throw new SortieIAInvalideError("JSON invalide renvoye par Gemini.", { cause: erreur });
    }
  }

  async synthetiserVoix(texte: string, delaiMs: number): Promise<AudioSynthetise> {
    try {
      const reponse = await this.client.models.generateContent({
        model: this.modeleVoix,
        contents: [{ role: "user", parts: [{ text: `Lis calmement, en français : ${texte}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voix } } },
          abortSignal: AbortSignal.timeout(delaiMs),
        },
      });
      const donnees = reponse.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData,
      )?.inlineData;
      if (!donnees?.data) {
        throw new SortieIAInvalideError("Aucun audio renvoye par Gemini.");
      }
      // Le type MIME ressemble à "audio/L16;codec=pcm;rate=24000".
      const frequence = Number(/rate=(\d+)/.exec(donnees.mimeType ?? "")?.[1] ?? 24000);
      return { pcm: Buffer.from(donnees.data, "base64"), frequence };
    } catch (erreur) {
      if (erreur instanceof SortieIAInvalideError) throw erreur;
      throw classerErreurGemini(erreur);
    }
  }
}

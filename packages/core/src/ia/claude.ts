// Client Claude (SDK officiel @anthropic-ai/sdk) pour tout le raisonnement :
// extraction des compétences (bilan et CV), correction, choix des pistes, reformulation.
// - Sortie structurée : output_config.format, construit depuis le schéma zod de la requête.
// - CV en PDF (bloc "document") ou en photo (bloc "image").
// - Repli serveur si le modèle décline une requête pour raison de sécurité
//   (fallbacks "default", bêta server-side-fallback-2026-07-01).
// Claude ne lit pas l'audio et ne produit pas de voix : ces appels sont confiés à un autre
// fournisseur par FournisseurComposite.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  IAIndisponibleError,
  SortieIAInvalideError,
  type AudioSynthetise,
  type FournisseurIA,
  type RequeteJson,
} from "./fournisseur";

export type EffortClaude = "low" | "medium" | "high" | "xhigh" | "max";

export interface OptionsClaude {
  apiKey: string;
  modele: string;
  /** Profondeur de réflexion : "low" tient l'objectif de 20 secondes pour les pistes. */
  effort?: EffortClaude;
  /** Pour les tests : fetch simulé. */
  fetch?: typeof fetch;
}

const TYPES_IMAGE = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
/** Codes HTTP qui signalent une indisponibilité temporaire (529 : API surchargée). */
const STATUTS_TEMPORAIRES = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

/** Classe une erreur du SDK : indisponibilité (nouvel essai plus tard) ou requête invalide. */
export function classerErreurClaude(erreur: unknown): Error {
  if (erreur instanceof Anthropic.APIConnectionError) {
    return new IAIndisponibleError("Claude injoignable ou trop lent.", { cause: erreur });
  }
  if (erreur instanceof Anthropic.APIError) {
    if (erreur.status !== undefined && STATUTS_TEMPORAIRES.has(erreur.status)) {
      return new IAIndisponibleError(`Claude indisponible (HTTP ${erreur.status}).`, {
        cause: erreur,
      });
    }
    return new SortieIAInvalideError(`Requete refusee par Claude (HTTP ${erreur.status}).`, {
      cause: erreur,
    });
  }
  // Erreur de lecture de la sortie structurée (JSON non conforme au schéma).
  return new SortieIAInvalideError("Sortie de Claude illisible.", { cause: erreur });
}

/** Bloc de contenu pour un CV : PDF en "document", photo en "image". */
function blocMedia(media: NonNullable<RequeteJson["media"]>) {
  const data = media.donnees.toString("base64");
  if (media.mimeType === "application/pdf") {
    return {
      type: "document" as const,
      source: { type: "base64" as const, media_type: "application/pdf" as const, data },
    };
  }
  if (TYPES_IMAGE.has(media.mimeType)) {
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: media.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data,
      },
    };
  }
  throw new SortieIAInvalideError(
    `Type de fichier non pris en charge par Claude : ${media.mimeType}`,
  );
}

export class FournisseurClaude implements FournisseurIA {
  readonly modele: string;
  readonly audioDisponible = false;
  private readonly client: Anthropic;
  private readonly effort: EffortClaude;

  constructor(options: OptionsClaude) {
    this.client = new Anthropic({ apiKey: options.apiKey, fetch: options.fetch });
    this.modele = options.modele;
    this.effort = options.effort ?? "low";
  }

  async genererJson(requete: RequeteJson): Promise<unknown> {
    // Le document ou l'image passe avant le texte, comme le recommande la documentation.
    const contenu = requete.media
      ? [blocMedia(requete.media), { type: "text" as const, text: requete.texte }]
      : [{ type: "text" as const, text: requete.texte }];

    let reponse;
    try {
      reponse = await this.client.beta.messages.parse(
        {
          model: this.modele,
          max_tokens: 8_000,
          system: requete.systeme,
          messages: [{ role: "user", content: contenu }],
          output_config: { effort: this.effort, format: betaZodOutputFormat(requete.schema) },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        // Le délai est tenu ici ; les nouveaux essais sont gérés par appelerAvecSchema.
        { timeout: requete.delaiMs, maxRetries: 0 },
      );
    } catch (erreur) {
      throw classerErreurClaude(erreur);
    }

    if (reponse.stop_reason === "refusal") {
      throw new SortieIAInvalideError("Claude a decline la requete.");
    }
    if (reponse.stop_reason === "max_tokens") {
      throw new SortieIAInvalideError("Reponse de Claude tronquee.");
    }
    if (reponse.parsed_output === null || reponse.parsed_output === undefined) {
      throw new SortieIAInvalideError("Aucune sortie structuree renvoyee par Claude.");
    }
    return reponse.parsed_output;
  }

  async synthetiserVoix(): Promise<AudioSynthetise> {
    throw new SortieIAInvalideError("Claude ne produit pas de voix.");
  }
}

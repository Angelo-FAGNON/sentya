// Interface d'un fournisseur d'IA. En production : Claude (Anthropic) pour le raisonnement,
// Gemini (Google) pour l'audio seulement, réunis par FournisseurComposite.
// Un fournisseur factice sert aux tests (aucun appel réseau).
import type { z } from "zod";

export interface PartieMedia {
  mimeType: string;
  donnees: Buffer;
}

export interface RequeteJson {
  /** Identifiant du prompt et de sa version, pour les journaux. */
  version: string;
  systeme: string;
  texte: string;
  media?: PartieMedia;
  /** Schéma zod de la sortie attendue (utilisé par Claude pour les sorties structurées). */
  schema: z.ZodType;
  /** Le même schéma en JSON Schema (utilisé par Gemini). */
  schemaJson: Record<string, unknown>;
  /** Délai maximal de l'appel, en millisecondes. */
  delaiMs: number;
}

export interface AudioSynthetise {
  /** PCM signé 16 bits, mono. */
  pcm: Buffer;
  frequence: number;
}

export interface FournisseurIA {
  readonly modele: string;
  /**
   * Faux si ce fournisseur ne peut ni transcrire un vocal ni produire de voix.
   * Le parcours demande alors au jeune d'écrire, et l'option audio est retirée.
   */
  readonly audioDisponible?: boolean;
  /** Renvoie le JSON brut produit par le modèle (validé ensuite par zod). */
  genererJson(requete: RequeteJson): Promise<unknown>;
  synthetiserVoix(texte: string, delaiMs: number): Promise<AudioSynthetise>;
}

/** Le service d'IA ne répond pas (réseau, quota, panne) : il faut réessayer plus tard. */
export class IAIndisponibleError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IAIndisponibleError";
  }
}

/** Le modèle a répondu, mais sa réponse n'est pas exploitable (JSON invalide, refus). */
export class SortieIAInvalideError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SortieIAInvalideError";
  }
}

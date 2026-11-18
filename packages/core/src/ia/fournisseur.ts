// Interface d'un fournisseur d'IA. Gemini est l'implémentation de production ;
// un fournisseur factice sert aux tests (aucun appel réseau).

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

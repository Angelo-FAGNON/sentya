// Abstraction du canal de conversation. Le parcours ne connaît que cette interface :
// Telegram est la première implémentation, WhatsApp pourra être ajouté sans toucher au noyau.

export type NomCanal = "TELEGRAM" | "WHATSAPP";

/** Nombre maximal de boutons par message (règle d'interface conversationnelle). */
export const BOUTONS_MAX = 3;

/** Taille maximale des données d'un bouton (limite Telegram : 64 octets). */
export const ACTION_OCTETS_MAX = 64;

export interface Bouton {
  libelle: string;
  /** Identifiant d'action renvoyé quand le jeune appuie (ex. "pays:BJ"). */
  action: string;
}

/** Bouton qui ouvre un lien (lien profond, page web). */
export interface BoutonLien {
  libelle: string;
  url: string;
}

export interface OptionsEnvoi {
  boutons?: Bouton[];
  lien?: BoutonLien;
}

/** Fichier reçu (vocal, PDF, photo) avant téléchargement. */
export interface FichierEntrant {
  reference: string;
  mimeType: string;
  tailleOctets?: number;
  dureeSecondes?: number;
}

/** Message entrant normalisé, indépendant du canal. */
export type MessageEntrant =
  | { type: "texte"; texte: string }
  | { type: "commande"; commande: string; argument?: string }
  | { type: "action"; action: string }
  | { type: "vocal"; fichier: FichierEntrant }
  | { type: "document"; fichier: FichierEntrant }
  | { type: "photo"; fichier: FichierEntrant }
  | { type: "autre" };

export interface Canal {
  readonly nom: NomCanal;
  envoyerTexte(destinataire: string, texte: string, options?: OptionsEnvoi): Promise<void>;
  /** Message vocal au format OGG/Opus. */
  envoyerVocal(destinataire: string, audioOggOpus: Buffer): Promise<void>;
  envoyerDocument(
    destinataire: string,
    contenu: Buffer,
    nomFichier: string,
    legende?: string,
  ): Promise<void>;
  /** Indicateur "en train d'écrire", affiché pendant les calculs longs. */
  indiquerActivite(destinataire: string): Promise<void>;
  telechargerFichier(fichier: FichierEntrant): Promise<{ donnees: Buffer; mimeType: string }>;
}

/** Vérifie les contraintes d'interface : 3 boutons maximum, actions courtes. */
export function verifierBoutons(boutons: Bouton[] | undefined): void {
  if (!boutons) return;
  if (boutons.length > BOUTONS_MAX) {
    throw new Error(`Trop de boutons : ${boutons.length} (maximum ${BOUTONS_MAX}).`);
  }
  for (const bouton of boutons) {
    if (Buffer.byteLength(bouton.action, "utf8") > ACTION_OCTETS_MAX) {
      throw new Error(`Action trop longue : ${bouton.action}`);
    }
  }
}

// Types du moteur de parcours : dépendances injectées, état persistant, entrée.
import type { Canal, MessageEntrant } from "../canal/canal";
import type { Contexte } from "../contexte";
import type { Activite } from "../orientation/competences";
import type { CleQuestion } from "../orientation/bilan";

/** Étapes de la machine à états, persistées dans ConversationState.etape. */
export type Etape =
  | "BILAN"
  | "CV"
  | "COMPLEMENT"
  | "VALIDATION"
  | "CORRECTION"
  | "PISTES"
  | "FICHE"
  | "PLAN"
  | "RAISON"
  | "SIGNALEMENT";

/** Données de travail de l'étape, persistées dans ConversationState.donnees (JSON). */
export interface DonneesEtat {
  question?: CleQuestion;
  competences?: string[];
  activites?: Activite[];
  cvCompetences?: string[];
  rang?: number;
  etapeId?: string;
  statutDemande?: "BLOQUE" | "ABANDONNE";
  opportuniteId?: string;
  /** Étape à retrouver après une parenthèse (raison, signalement). */
  retour?: Etape;
  /** Horodatage de la première confirmation de /supprimer (ISO). */
  suppressionDemandeeLe?: string;
  /** Horodatage de la demande /recommencer (ISO). */
  recommencerDemandeLe?: string;
  /** Message mis de côté pendant une indisponibilité de l'IA. */
  enAttente?: { entree: MessageEntrant; tentative: number };
}

export interface EtatConversation {
  etape: Etape;
  donnees: DonneesEtat;
}

/** Programmation des travaux différés (pg-boss en production, factice en test). */
export interface Planificateur {
  programmerRappels(rappels: { id: string; prevuLe: Date }[]): Promise<void>;
  programmerReprise(userId: string, tentative: number, delaiSecondes: number): Promise<void>;
}

export interface DependancesParcours {
  ctx: Contexte;
  canal: Canal;
  planificateur: Planificateur;
  /** URL de la page de confidentialité affichée au consentement. */
  urlConfidentialite: string;
  /** Génère le PDF du plan (pdfkit dans le bot). */
  genererPdfPlan?: (planId: string) => Promise<Buffer>;
  /** Convertit le PCM de la synthèse vocale en OGG/Opus (ffmpeg dans le bot). */
  convertirVoix?: (pcm: Buffer, frequence: number) => Promise<Buffer>;
}

export interface EntreeParcours {
  /** Identifiant de l'utilisateur sur le canal (Telegram : identifiant numérique). */
  idCanal: string;
  /** Prénom donné par le canal ; utilisé seulement après consentement. */
  prenomCanal?: string | null;
  message: MessageEntrant;
  /** Numéro de la tentative quand le message est rejoué par une tâche de reprise. */
  tentative?: number;
  /** Vrai au dernier essai : les étapes utilisent leur repli sans IA. */
  derniereTentative?: boolean;
}

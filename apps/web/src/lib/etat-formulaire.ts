// État renvoyé par une action de formulaire : message global et erreurs par champ.
import type { z } from "zod";
import { erreursParChamp } from "./schemas";

export type EtatFormulaire =
  | { statut: "inactif" }
  | { statut: "erreur"; message: string; champs: Record<string, string> }
  | { statut: "succes"; message: string };

export const ETAT_INITIAL: EtatFormulaire = { statut: "inactif" };

export function echec(message: string, champs: Record<string, string> = {}): EtatFormulaire {
  return { statut: "erreur", message, champs };
}

export function succes(message: string): EtatFormulaire {
  return { statut: "succes", message };
}

export function echecValidation(erreur: z.ZodError): EtatFormulaire {
  const champs = erreursParChamp(erreur);
  const nombre = Object.keys(champs).length;
  return echec(
    nombre > 1
      ? `${nombre} champs sont à corriger. Les erreurs sont indiquées sous chaque champ.`
      : "Un champ est à corriger. L'erreur est indiquée sous le champ.",
    champs,
  );
}

// Appel à l'IA avec sortie JSON validée par zod.
// Règle : une seule nouvelle tentative en cas de sortie invalide, puis l'appelant
// applique un repli déterministe. Si l'IA est indisponible, l'erreur remonte telle quelle
// pour que l'appelant prévienne le jeune et programme un nouvel essai.
import type { z } from "zod";
import type { Journal } from "../journal";
import {
  IAIndisponibleError,
  SortieIAInvalideError,
  type FournisseurIA,
  type PartieMedia,
} from "./fournisseur";
import { versJsonSchema } from "./schemas";

export const TENTATIVES_MAX = 2;

export interface ParametresAppel<S extends z.ZodType> {
  version: string;
  systeme: string;
  texte: string;
  media?: PartieMedia;
  schema: S;
  delaiMs: number;
}

export type ResultatAppel<T> =
  | { ok: true; donnees: T; tentatives: number }
  | { ok: false; tentatives: number; erreurs: string[] };

export async function appelerAvecSchema<S extends z.ZodType>(
  ia: FournisseurIA,
  parametres: ParametresAppel<S>,
  journal: Journal,
): Promise<ResultatAppel<z.infer<S>>> {
  const schemaJson = versJsonSchema(parametres.schema);
  const erreurs: string[] = [];

  for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative += 1) {
    const debut = Date.now();
    try {
      const brut = await ia.genererJson({
        version: parametres.version,
        systeme: parametres.systeme,
        texte: parametres.texte,
        media: parametres.media,
        schemaJson,
        delaiMs: parametres.delaiMs,
      });
      const resultat = parametres.schema.safeParse(brut);
      if (resultat.success) {
        journal.info(
          { prompt: parametres.version, tentative, dureeMs: Date.now() - debut },
          "sortie IA valide",
        );
        return { ok: true, donnees: resultat.data, tentatives: tentative };
      }
      erreurs.push(`validation : ${resultat.error.issues.map((i) => i.message).join(", ")}`);
    } catch (erreur) {
      if (erreur instanceof IAIndisponibleError) throw erreur;
      if (erreur instanceof SortieIAInvalideError) {
        erreurs.push(erreur.message);
      } else {
        throw erreur;
      }
    }
    journal.warn({ prompt: parametres.version, tentative }, "sortie IA invalide");
  }

  journal.warn({ prompt: parametres.version, erreurs }, "repli deterministe apres deux echecs");
  return { ok: false, tentatives: TENTATIVES_MAX, erreurs };
}

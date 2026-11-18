// Schémas zod de toutes les sorties de l'IA. Chaque sortie est validée avant usage ;
// le même schéma est converti en JSON Schema et transmis à Gemini (sortie structurée).
import { z } from "zod";

export const VOIES = ["EMPLOI", "FORMATION_CERTIFICATION", "AUTO_EMPLOI"] as const;

export const schemaExtraction = z.object({
  competences: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        preuve: z.string().max(200),
      }),
    )
    .max(15),
  activites: z
    .array(
      z.object({
        libelle: z.string().min(1).max(80),
        dureeMois: z.number().int().min(0).max(600).nullable(),
      }),
    )
    .max(10),
});
export type SortieExtraction = z.infer<typeof schemaExtraction>;

export const schemaCorrection = z.object({
  ajouter: z.array(z.string().min(1).max(80)).max(10),
  retirer: z.array(z.string().min(1).max(80)).max(10),
});
export type SortieCorrection = z.infer<typeof schemaCorrection>;

export const schemaChoixPistes = z.object({
  pistes: z
    .array(
      z.object({
        metierId: z.string().min(1).max(80),
        voie: z.enum(VOIES),
        raison: z.string().min(5).max(220),
        conditionPrincipale: z.string().min(3).max(160),
      }),
    )
    .min(1)
    .max(3),
});
export type SortieChoixPistes = z.infer<typeof schemaChoixPistes>;

export const schemaReformulation = z.object({
  texte: z.string().min(1).max(800),
});
export type SortieReformulation = z.infer<typeof schemaReformulation>;

export const schemaTranscription = z.object({
  texte: z.string().max(3000),
  inaudible: z.boolean(),
});
export type SortieTranscription = z.infer<typeof schemaTranscription>;

/**
 * Convertit un schéma zod en JSON Schema accepté par Gemini (responseJsonSchema).
 * On retire la clé "$schema", inutile pour l'API.
 */
export function versJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

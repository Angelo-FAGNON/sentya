// Lecture typée des champs Sentya portés par le jeton de session.
import { z } from "zod";
import { ROLES } from "./roles";

const schemaSession = z.object({
  id: z.string().min(1),
  role: z.enum(ROLES),
  partenaireId: z.string().nullable().default(null),
  totpRequis: z.boolean().default(false),
});

export type InfosSession = z.infer<typeof schemaSession>;

/** Renvoie les champs Sentya d'un objet (utilisateur ou jeton), ou null s'ils sont absents. */
export function lireSessionBrute(objet: unknown): InfosSession | null {
  const resultat = schemaSession.safeParse(objet);
  return resultat.success ? resultat.data : null;
}

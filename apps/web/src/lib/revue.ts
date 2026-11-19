// Lecture défensive du JSON de conversation pseudonymisée (RevueQualite.conversationAnonymisee).
import { z } from "zod";
import { PAYS, VOIES } from "./valeurs";

const texte = z.string().catch("");

const schemaConversation = z.object({
  pays: z.enum(PAYS).nullable().catch(null).default(null),
  promptVersion: z.string().nullable().catch(null).default(null),
  reponses: z
    .array(z.object({ question: texte, texte }))
    .catch([])
    .default([]),
  competences: z.array(z.string()).catch([]).default([]),
  candidats: z.array(z.string()).catch([]).default([]),
  idsRejetes: z.array(z.string()).catch([]).default([]),
  pistes: z
    .array(
      z.object({
        rang: z.number().catch(0),
        metier: texte,
        voie: z.enum(VOIES).nullable().catch(null),
        raison: texte,
        condition: texte,
        aExplorer: z.boolean().catch(false),
      }),
    )
    .catch([])
    .default([]),
});

export type ConversationRevue = z.infer<typeof schemaConversation>;

export function lireConversation(json: unknown): ConversationRevue {
  const resultat = schemaConversation.safeParse(json ?? {});
  return resultat.success ? resultat.data : schemaConversation.parse({});
}

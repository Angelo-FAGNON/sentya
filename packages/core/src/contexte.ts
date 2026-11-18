// Dépendances injectées dans toute la logique métier : base, IA, horloge, journal.
// Rien n'est global, ce qui rend chaque règle testable avec une horloge simulée et une IA factice.
import type { PrismaClient } from "@sentya/db";
import type { Horloge } from "./horloge";
import type { FournisseurIA } from "./ia/fournisseur";
import type { Journal } from "./journal";

export interface Contexte {
  prisma: PrismaClient;
  ia: FournisseurIA;
  horloge: Horloge;
  journal: Journal;
  /** Sel secret du hachage des identifiants (HASH_SALT). */
  sel: string;
  /** URL publique du site (liens magiques, confidentialité). */
  appUrl: string;
}

/** Client utilisable dans ou hors transaction. */
export type ClientBase = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

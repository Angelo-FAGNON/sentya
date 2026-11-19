// Reformulation en français simple d'un texte issu de la base (prompt reformulation@1).
// Garde-fou : la sortie de l'IA est refusée si elle contient un nombre, un lien ou une adresse
// e-mail absents du texte source. En cas de doute, le texte d'origine est conservé.
import type { Contexte } from "../contexte";
import { appelerAvecSchema } from "../ia/appel-structure";
import { IAIndisponibleError } from "../ia/fournisseur";
import { schemaReformulation } from "../ia/schemas";
import { PROMPT_REFORMULATION } from "../prompts/reformulation.v1";
import { normaliser } from "../texte";

/** Nombres, liens et adresses e-mail d'un texte (éléments qui ne doivent jamais être inventés). */
function elementsFactuels(texte: string): Set<string> {
  return new Set(normaliser(texte).match(/https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+|\d+/g) ?? []);
}

/** Vrai si la reformulation n'introduit aucun nombre, lien ni e-mail absent de la source. */
export function reformulationFidele(source: string, reformulation: string): boolean {
  const autorises = elementsFactuels(source);
  return [...elementsFactuels(reformulation)].every((element) => autorises.has(element));
}

/** Reformule un texte ; renvoie le texte d'origine si l'IA échoue ou invente un élément. */
export async function reformuler(ctx: Contexte, texte: string): Promise<string> {
  try {
    const resultat = await appelerAvecSchema(
      ctx.ia,
      {
        version: PROMPT_REFORMULATION.version,
        systeme: PROMPT_REFORMULATION.systeme,
        texte,
        schema: schemaReformulation,
        delaiMs: 8_000,
      },
      ctx.journal,
    );
    if (resultat.ok && reformulationFidele(texte, resultat.donnees.texte)) {
      return resultat.donnees.texte;
    }
    if (resultat.ok) ctx.journal.warn("reformulation refusee : element factuel invente");
  } catch (erreur) {
    if (!(erreur instanceof IAIndisponibleError)) throw erreur;
  }
  return texte;
}

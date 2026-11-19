// Mots de passe : argon2id. Un hachage factice sert à garder un temps de réponse constant
// quand l'e-mail saisi ne correspond à aucun compte.
import "server-only";
import argon2 from "argon2";

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return argon2.hash(motDePasse, OPTIONS);
}

let hachageFactice: Promise<string> | undefined;

/** Vérifie un mot de passe. Sans hachage (compte inconnu), on vérifie contre un hachage factice. */
export async function verifierMotDePasse(
  hachage: string | null | undefined,
  motDePasse: string,
): Promise<boolean> {
  hachageFactice ??= argon2.hash("sentya-compte-inexistant", OPTIONS);
  const reference = hachage ?? (await hachageFactice);
  try {
    const valide = await argon2.verify(reference, motDePasse);
    return valide && !!hachage;
  } catch {
    return false;
  }
}

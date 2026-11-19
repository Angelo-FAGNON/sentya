// Journal des accès (JournalAcces) : chaque connexion, réussie ou non, et chaque modification.
// Jamais de mot de passe, jamais de code TOTP.
import "server-only";
import { getPrisma, type TypeActeur } from "@sentya/db";
import { headers } from "next/headers";
import { journalWeb } from "./contexte";
import { ipDepuisEntetes } from "./ip";

/** Identifiant utilisé quand l'e-mail saisi ne correspond à aucun compte. */
export const ACTEUR_INCONNU = "inconnu";

export interface Acteur {
  type: TypeActeur;
  id: string;
}

export async function journaliser(
  acteur: Acteur,
  action: string,
  ressource: string | null = null,
  ip?: string,
): Promise<void> {
  try {
    const adresse = ip ?? ipDepuisEntetes(await headers());
    await getPrisma().journalAcces.create({
      data: {
        acteurType: acteur.type,
        acteurId: acteur.id,
        action,
        ressource: ressource?.slice(0, 300) ?? null,
        ip: adresse,
      },
    });
  } catch (erreur) {
    // Le journal ne doit jamais bloquer l'action, mais l'échec est tracé.
    journalWeb().error({ err: erreur, action }, "ecriture du journal des acces impossible");
  }
}

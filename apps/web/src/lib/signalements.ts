// Une opportunité signalée ne peut pas être revérifiée tant que ses signalements n'ont pas
// reçu de décision (RG-06) : la revue passe par la file des signalements.
import "server-only";
import { getPrisma } from "@sentya/db";

export const MESSAGE_SIGNALEMENTS_EN_ATTENTE =
  "Des signalements attendent une décision sur cette offre. Traite-les d'abord dans la page Signalements.";

export async function aDesSignalementsEnAttente(opportuniteId: string): Promise<boolean> {
  const nombre = await getPrisma().signalement.count({
    where: { opportuniteId, traite: false },
  });
  return nombre > 0;
}

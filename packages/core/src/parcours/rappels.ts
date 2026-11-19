// EF-08 : envoi d'un rappel J+3, J+7 ou J+30, déclenché par la tâche planifiée.
// Idempotent : un rappel déjà envoyé, ou dont le plan n'est plus actif, est ignoré.
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { fr, STATUT_ETAPE_LIBELLE } from "../messages/fr";
import { JOURS_PAR_RAPPEL, reserverRappel } from "../regles/rappels";
import { ACTIONS } from "./actions";
import { Envoi, envoyerAudio } from "./envoi";
import type { DependancesParcours } from "./types";

export async function executerRappel(
  deps: DependancesParcours,
  rappelId: string,
): Promise<boolean> {
  const { ctx } = deps;
  const rappel = await reserverRappel(ctx.prisma, rappelId, ctx.horloge.maintenant());
  if (!rappel) return false;
  const { user, etapes } = rappel.plan;
  if (user.telegramId === null) return false;

  const envoi = new Envoi(deps.canal, user.telegramId.toString());
  const restantes = etapes.filter((e) => e.statut === "A_FAIRE" || e.statut === "BLOQUE");

  if (restantes.length === 0) {
    await envoi.texte(fr.rappelToutFait);
  } else {
    await envoi.texte(fr.rappel(JOURS_PAR_RAPPEL[rappel.type]));
    for (const etape of restantes) {
      await envoi.texte(
        fr.rappelEtape(etape.ordre, etape.titre, STATUT_ETAPE_LIBELLE[etape.statut]),
        {
          boutons: [
            { libelle: fr.boutons.fait, action: ACTIONS.statutEtape(etape.id, "F") },
            { libelle: fr.boutons.bloque, action: ACTIONS.statutEtape(etape.id, "B") },
            { libelle: fr.boutons.abandonne, action: ACTIONS.statutEtape(etape.id, "A") },
          ],
        },
      );
    }
  }

  await enregistrerEvenement(ctx.prisma, {
    type: EVENEMENTS.RAPPEL_ENVOYE,
    userHash: user.userHash,
    payload: { type: rappel.type, planRef: rappel.planId, etapesRestantes: restantes.length },
    date: ctx.horloge.maintenant(),
  });

  if (user.audioReplies && ctx.ia.audioDisponible !== false && deps.convertirVoix) {
    await envoyerAudio({
      ia: ctx.ia,
      canal: deps.canal,
      destinataire: envoi.destinataire,
      textes: envoi.textes,
      convertirVoix: deps.convertirVoix,
      journal: ctx.journal,
    });
  }
  return true;
}

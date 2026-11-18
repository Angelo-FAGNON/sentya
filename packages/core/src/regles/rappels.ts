// EF-08 : rappels J+3, J+7 et J+30. pg-boss déclenche ; la table Rappel garantit
// qu'un rappel n'est envoyé qu'une fois. Les rappels partent entre 8 h et 20 h (H10).
import type { TypeRappel } from "@sentya/db";
import type { ClientBase } from "../contexte";
import { composantesLocales, dateLocale } from "../dates";
import { ajouterJours } from "../horloge";

export const RAPPELS: { type: TypeRappel; jours: number }[] = [
  { type: "J3", jours: 3 },
  { type: "J7", jours: 7 },
  { type: "J30", jours: 30 },
];

export const HEURE_DEBUT_RAPPELS = 8;
export const HEURE_FIN_RAPPELS = 20;

/** Ramène une date dans la plage horaire autorisée (heure locale UTC+1). */
export function ajusterPlageHoraire(date: Date): Date {
  const { annee, mois, jour, heure } = composantesLocales(date);
  if (heure < HEURE_DEBUT_RAPPELS) return dateLocale(annee, mois, jour, HEURE_DEBUT_RAPPELS);
  if (heure >= HEURE_FIN_RAPPELS) {
    return ajouterJours(dateLocale(annee, mois, jour, HEURE_DEBUT_RAPPELS), 1);
  }
  return date;
}

/** Dates des trois rappels d'un plan créé à la date donnée. */
export function calculerRappels(creation: Date): { type: TypeRappel; prevuLe: Date }[] {
  return RAPPELS.map(({ type, jours }) => ({
    type,
    prevuLe: ajusterPlageHoraire(ajouterJours(creation, jours)),
  }));
}

export const JOURS_PAR_RAPPEL: Record<TypeRappel, number> = { J3: 3, J7: 7, J30: 30 };

/**
 * Réserve un rappel pour envoi. Renvoie null si le rappel est déjà parti, pas encore dû,
 * ou si le plan n'est plus actif (changement de piste, anonymisation, suppression).
 * La mise à jour conditionnelle rend l'opération sûre même si pg-boss rejoue le travail.
 */
export async function reserverRappel(prisma: ClientBase, rappelId: string, maintenant: Date) {
  const reserve = await prisma.rappel.updateMany({
    where: { id: rappelId, envoyeLe: null, prevuLe: { lte: maintenant }, plan: { actif: true } },
    data: { envoyeLe: maintenant },
  });
  if (reserve.count === 0) return null;

  return prisma.rappel.findUnique({
    where: { id: rappelId },
    include: {
      plan: {
        include: {
          etapes: { orderBy: { ordre: "asc" } },
          user: { select: { id: true, telegramId: true, userHash: true, audioReplies: true } },
        },
      },
    },
  });
}

/** Rappels dus et non envoyés : filet de sécurité si un travail pg-boss a été perdu. */
export async function rappelsEnRetard(prisma: ClientBase, maintenant: Date) {
  return prisma.rappel.findMany({
    where: { envoyeLe: null, prevuLe: { lte: maintenant }, plan: { actif: true } },
    select: { id: true },
    take: 500,
  });
}

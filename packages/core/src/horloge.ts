// Horloge injectable : le code métier ne lit jamais Date.now() directement,
// ce qui permet de tester les rappels J+3, J+7, J+30 avec une horloge simulée.

export interface Horloge {
  maintenant(): Date;
}

export const horlogeSysteme: Horloge = {
  maintenant: () => new Date(),
};

/** Horloge pilotée par les tests. */
export class HorlogeSimulee implements Horloge {
  private instant: number;

  constructor(depart: Date | string) {
    this.instant = new Date(depart).getTime();
  }

  maintenant(): Date {
    return new Date(this.instant);
  }

  avancer(ms: number): void {
    this.instant += ms;
  }

  avancerJours(jours: number): void {
    this.avancer(jours * JOUR_MS);
  }

  fixer(date: Date | string): void {
    this.instant = new Date(date).getTime();
  }
}

export const HEURE_MS = 60 * 60 * 1000;
export const JOUR_MS = 24 * HEURE_MS;

/** Ajoute un nombre de jours calendaires à une date. */
export function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * JOUR_MS);
}

/** Retire un nombre de mois calendaires (utilisé pour les seuils de 6 et 12 mois). */
export function retirerMois(date: Date, mois: number): Date {
  const resultat = new Date(date.getTime());
  resultat.setUTCMonth(resultat.getUTCMonth() - mois);
  return resultat;
}

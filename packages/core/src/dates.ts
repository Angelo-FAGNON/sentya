// Dates affichées au jeune, à l'heure du Bénin et du Togo (UTC+1, sans heure d'été).
// On calcule le décalage à la main pour ne dépendre d'aucune base de fuseaux.

export const DECALAGE_LOCAL_MS = 60 * 60 * 1000;

/** Renvoie les composantes de la date à l'heure locale (UTC+1). */
export function composantesLocales(date: Date) {
  const locale = new Date(date.getTime() + DECALAGE_LOCAL_MS);
  return {
    annee: locale.getUTCFullYear(),
    mois: locale.getUTCMonth() + 1,
    jour: locale.getUTCDate(),
    heure: locale.getUTCHours(),
    minute: locale.getUTCMinutes(),
  };
}

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/** Format JJ/MM/AAAA, exigé pour la mention "Vérifiée le JJ/MM/AAAA". */
export function formaterDate(date: Date): string {
  const { annee, mois, jour } = composantesLocales(date);
  return `${deuxChiffres(jour)}/${deuxChiffres(mois)}/${annee}`;
}

/** Crée une date à partir d'une heure locale (UTC+1). */
export function dateLocale(annee: number, mois: number, jour: number, heure = 0, minute = 0) {
  return new Date(Date.UTC(annee, mois - 1, jour, heure, minute) - DECALAGE_LOCAL_MS);
}

/** Semaine ISO 8601 au format "2026-W47", pour l'échantillon de revue qualité. */
export function semaineIso(date: Date): string {
  const { annee, mois, jour } = composantesLocales(date);
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  const jourSemaine = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jourSemaine);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numero = Math.ceil(((d.getTime() - debutAnnee.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${deuxChiffres(numero)}`;
}

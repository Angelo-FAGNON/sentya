// Indicateurs du tableau de bord (EF-12). Calculés à partir des événements, pour
// survivre aux suppressions et anonymisations (H6), et du référentiel pour la fraîcheur.
import type { ClientBase } from "../contexte";
import { ajouterJours, retirerMois } from "../horloge";
import { MOIS_AVANT_PEREMPTION } from "../regles/peremption";
import { EVENEMENTS } from "./evenements";

export interface Indicateurs {
  periode: { debut: Date; fin: Date };
  nouveauxUtilisateursParCanal: { canal: string; source: string; nombre: number }[];
  /** Bilans terminés / bilans commencés, sur la période. */
  tauxBilansTermines: number | null;
  /** Durée médiane entre la création du profil et le premier plan, en minutes. */
  tempsMedianJusquauPlanMinutes: number | null;
  /** Indicateur clé : étapes faites dans les 30 jours / étapes des plans créés il y a 30 à 60 jours. */
  partEtapesRealisees30j: number | null;
  opportunitesSignalees: number;
  opportunitesSuspendues: number;
  /** Fiches vérifiées depuis moins de 6 mois / fiches publiées (hors brouillons). */
  partFichesAJour: number | null;
}

export function mediane(valeurs: number[]): number | null {
  if (valeurs.length === 0) return null;
  const tries = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tries.length / 2);
  return tries.length % 2 === 0
    ? ((tries[milieu - 1] ?? 0) + (tries[milieu] ?? 0)) / 2
    : (tries[milieu] ?? 0);
}

const ratio = (a: number, b: number) => (b === 0 ? null : Math.round((a / b) * 1000) / 1000);

export async function calculerIndicateurs(
  prisma: ClientBase,
  maintenant: Date,
  jours = 30,
): Promise<Indicateurs> {
  const debut = ajouterJours(maintenant, -jours);
  const periode = { createdAt: { gte: debut, lte: maintenant } };

  const profils = await prisma.evenementAnalytique.findMany({
    where: { type: EVENEMENTS.PROFIL_CREE, ...periode },
    select: { canal: true, payload: true },
  });
  const parCanal = new Map<string, number>();
  for (const p of profils) {
    const source = (p.payload as { source?: string } | null)?.source ?? "direct";
    const cle = `${p.canal ?? "INCONNU"}|${source}`;
    parCanal.set(cle, (parCanal.get(cle) ?? 0) + 1);
  }

  const [commences, termines] = await Promise.all([
    prisma.evenementAnalytique.count({ where: { type: EVENEMENTS.BILAN_COMMENCE, ...periode } }),
    prisma.evenementAnalytique.count({ where: { type: EVENEMENTS.BILAN_TERMINE, ...periode } }),
  ]);

  const plans = await prisma.evenementAnalytique.findMany({
    where: { type: EVENEMENTS.PLAN_CREE, ...periode },
    select: { payload: true },
  });
  const durees = plans
    .map((p) => (p.payload as { dureeDepuisProfilMs?: number } | null)?.dureeDepuisProfilMs)
    .filter((d): d is number => typeof d === "number")
    .map((ms) => ms / 60_000);

  // Cohorte : plans créés entre J-60 et J-30, observés sur leurs 30 premiers jours.
  const cohorte = await prisma.evenementAnalytique.findMany({
    where: {
      type: EVENEMENTS.PLAN_CREE,
      createdAt: { gte: ajouterJours(maintenant, -60), lt: ajouterJours(maintenant, -30) },
    },
    select: { payload: true },
  });
  const plansCohorte = new Map<string, number>();
  for (const p of cohorte) {
    const payload = p.payload as { planRef?: string; nbEtapes?: number } | null;
    if (payload?.planRef) plansCohorte.set(payload.planRef, payload.nbEtapes ?? 3);
  }
  let etapesFaites = 0;
  if (plansCohorte.size > 0) {
    const statuts = await prisma.evenementAnalytique.findMany({
      where: { type: EVENEMENTS.ETAPE_STATUT, createdAt: { gte: ajouterJours(maintenant, -60) } },
      select: { payload: true },
    });
    const faites = new Set<string>();
    for (const s of statuts) {
      const payload = s.payload as {
        planRef?: string;
        ordre?: number;
        statut?: string;
        joursDepuisPlan?: number;
      } | null;
      if (
        payload?.planRef &&
        plansCohorte.has(payload.planRef) &&
        payload.statut === "FAIT" &&
        (payload.joursDepuisPlan ?? 99) <= 30
      ) {
        faites.add(`${payload.planRef}:${payload.ordre}`);
      }
    }
    etapesFaites = faites.size;
  }
  const etapesCohorte = [...plansCohorte.values()].reduce((s, n) => s + n, 0);

  const [signalees, suspendues] = await Promise.all([
    prisma.evenementAnalytique.count({ where: { type: EVENEMENTS.SIGNALEMENT, ...periode } }),
    prisma.opportunite.count({ where: { statut: "SUSPENDUE" } }),
  ]);

  const limite = retirerMois(maintenant, MOIS_AVANT_PEREMPTION);
  const publiees = { statut: { not: "BROUILLON" as const } };
  const aJour = { statut: "VERIFIEE" as const, verifieLe: { gte: limite } };
  const [totaux, frais] = await Promise.all([
    Promise.all([
      prisma.metier.count({ where: publiees }),
      prisma.formation.count({ where: publiees }),
      prisma.programme.count({ where: publiees }),
      prisma.opportunite.count({ where: publiees }),
    ]),
    Promise.all([
      prisma.metier.count({ where: aJour }),
      prisma.formation.count({ where: aJour }),
      prisma.programme.count({ where: aJour }),
      prisma.opportunite.count({ where: aJour }),
    ]),
  ]);
  const somme = (l: number[]) => l.reduce((s, n) => s + n, 0);

  return {
    periode: { debut, fin: maintenant },
    nouveauxUtilisateursParCanal: [...parCanal.entries()]
      .map(([cle, nombre]) => {
        const [canal = "INCONNU", source = "direct"] = cle.split("|");
        return { canal, source, nombre };
      })
      .sort((a, b) => b.nombre - a.nombre),
    tauxBilansTermines: ratio(termines, commences),
    tempsMedianJusquauPlanMinutes: mediane(durees),
    partEtapesRealisees30j: ratio(etapesFaites, etapesCohorte),
    opportunitesSignalees: signalees,
    opportunitesSuspendues: suspendues,
    partFichesAJour: ratio(somme(frais), somme(totaux)),
  };
}

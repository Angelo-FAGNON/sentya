// Tâches planifiées avec pg-boss (adossé à PostgreSQL, sans Redis) :
// - rappels J+3, J+7, J+30 et nouvel essai quand l'IA est indisponible ;
// - quotidiennes : péremption à 6 mois (RG-04), anonymisation à 12 mois (RG-12),
//   purge des update_id, filet de sécurité des rappels en retard ;
// - hebdomadaire : échantillon de revue qualité.
import type { PgBoss } from "pg-boss";
import {
  anonymiserInactifs,
  echantillonnerRevue,
  executerRappel,
  marquerFichesPerimees,
  rappelsEnRetard,
  reprendreMessageEnAttente,
  type DependancesParcours,
  type Planificateur,
} from "@sentya/core";
import { purgerMisesAJour } from "../middlewares/idempotence";
import type { VerrouParCle } from "../middlewares/verrou";

export const FILES = {
  rappel: "rappel",
  reprise: "reprise-ia",
  peremption: "peremption",
  anonymisation: "anonymisation",
  revue: "revue-qualite",
  purge: "purge-mises-a-jour",
  retard: "rappels-en-retard",
} as const;

/** Fuseau du Bénin et du Togo (UTC+1). */
const FUSEAU = "Africa/Lagos";

export class PlanificateurPgBoss implements Planificateur {
  constructor(private readonly boss: PgBoss) {}

  async programmerRappels(rappels: { id: string; prevuLe: Date }[]): Promise<void> {
    for (const rappel of rappels) {
      await this.boss.sendAfter(
        FILES.rappel,
        { rappelId: rappel.id },
        { singletonKey: rappel.id, retryLimit: 3 },
        rappel.prevuLe,
      );
    }
  }

  async programmerReprise(userId: string, tentative: number, delaiSecondes: number): Promise<void> {
    await this.boss.sendAfter(
      FILES.reprise,
      { userId, tentative },
      { singletonKey: `${userId}-${tentative}`, retryLimit: 1 },
      delaiSecondes,
    );
  }
}

export async function demarrerTaches(
  boss: PgBoss,
  deps: DependancesParcours,
  verrou: VerrouParCle,
): Promise<void> {
  const { ctx } = deps;
  for (const file of Object.values(FILES)) await boss.createQueue(file);

  /** Exécute une tâche liée à un jeune sous son verrou (jamais en parallèle d'un message). */
  const sousVerrouDuJeune = async (userId: string, tache: () => Promise<unknown>) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });
    if (!user?.telegramId) return;
    await verrou.executer(user.telegramId.toString(), tache);
  };

  await boss.work<{ rappelId: string }>(FILES.rappel, async (travaux) => {
    for (const travail of travaux) {
      const rappel = await ctx.prisma.rappel.findUnique({
        where: { id: travail.data.rappelId },
        select: { plan: { select: { userId: true } } },
      });
      // Rappel supprimé (changement de piste, /supprimer) : rien à faire.
      if (!rappel) continue;
      await sousVerrouDuJeune(rappel.plan.userId, () =>
        executerRappel(deps, travail.data.rappelId),
      );
    }
  });

  await boss.work<{ userId: string }>(FILES.reprise, async (travaux) => {
    for (const travail of travaux) {
      await sousVerrouDuJeune(travail.data.userId, () =>
        reprendreMessageEnAttente(deps, travail.data.userId),
      );
    }
  });

  await boss.work(FILES.peremption, async () => {
    const r = await marquerFichesPerimees(ctx.prisma, ctx.horloge.maintenant());
    ctx.journal.info(r, "peremption des fiches");
  });
  await boss.work(FILES.anonymisation, async () => {
    const n = await anonymiserInactifs(ctx.prisma, ctx.horloge.maintenant());
    ctx.journal.info({ profils: n }, "anonymisation des inactifs");
  });
  await boss.work(FILES.revue, async () => {
    const n = await echantillonnerRevue(ctx.prisma, ctx.horloge.maintenant());
    ctx.journal.info({ conversations: n }, "echantillon de revue qualite");
  });
  await boss.work(FILES.purge, async () => {
    const n = await purgerMisesAJour(ctx.prisma, ctx.horloge.maintenant());
    ctx.journal.info({ supprimees: n }, "purge des update_id");
  });
  await boss.work(FILES.retard, async () => {
    for (const { id } of await rappelsEnRetard(ctx.prisma, ctx.horloge.maintenant())) {
      await boss.send(FILES.rappel, { rappelId: id }, { singletonKey: id });
    }
  });

  await boss.schedule(FILES.peremption, "0 2 * * *", null, { tz: FUSEAU });
  await boss.schedule(FILES.anonymisation, "0 3 * * *", null, { tz: FUSEAU });
  await boss.schedule(FILES.purge, "30 3 * * *", null, { tz: FUSEAU });
  await boss.schedule(FILES.revue, "0 4 * * 1", null, { tz: FUSEAU });
  await boss.schedule(FILES.retard, "*/15 8-19 * * *", null, { tz: FUSEAU });
}

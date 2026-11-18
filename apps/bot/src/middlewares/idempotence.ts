// Idempotence : une mise à jour Telegram (update_id) n'est traitée qu'une fois,
// même si Telegram la renvoie après un délai dépassé ou une coupure.
import { Prisma, type PrismaClient } from "@sentya/db";

/** Renvoie true si la mise à jour est nouvelle (et la marque comme traitée). */
export async function marquerMiseAJour(prisma: PrismaClient, updateId: number): Promise<boolean> {
  try {
    await prisma.processedUpdate.create({ data: { updateId: BigInt(updateId) } });
    return true;
  } catch (erreur) {
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002")
      return false;
    throw erreur;
  }
}

/** Purge les identifiants de plus de 7 jours (Telegram ne renvoie jamais au-delà de 24 heures). */
export async function purgerMisesAJour(prisma: PrismaClient, maintenant: Date): Promise<number> {
  const { count } = await prisma.processedUpdate.deleteMany({
    where: { recuLe: { lt: new Date(maintenant.getTime() - 7 * 24 * 3600_000) } },
  });
  return count;
}

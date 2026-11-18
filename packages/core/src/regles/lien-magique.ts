// EF-11 : lien magique à usage unique pour consulter son plan sur le web, sans mot de passe.
// Seul le SHA-256 du jeton est stocké ; le lien expire après 15 minutes.
import type { ClientBase, Contexte } from "../contexte";
import { genererJeton, sha256 } from "../confidentialite/hachage";

export const DUREE_LIEN_MINUTES = 15;

export async function creerLienMagique(ctx: Contexte, userId: string): Promise<string> {
  const { jeton, hash } = genererJeton();
  const maintenant = ctx.horloge.maintenant();
  await ctx.prisma.magicLink.create({
    data: {
      tokenHash: hash,
      userId,
      expiresAt: new Date(maintenant.getTime() + DUREE_LIEN_MINUTES * 60_000),
      createdAt: maintenant,
    },
  });
  return `${ctx.appUrl.replace(/\/$/, "")}/monplan/${jeton}`;
}

/** Le lien existe-t-il, non utilisé et non expiré ? (affichage de la page, sans consommer) */
export async function lienMagiqueValide(
  prisma: ClientBase,
  jeton: string,
  maintenant: Date,
): Promise<boolean> {
  const lien = await prisma.magicLink.findUnique({ where: { tokenHash: sha256(jeton) } });
  return !!lien && !lien.usedAt && lien.expiresAt > maintenant;
}

/**
 * Consomme le lien de façon atomique et renvoie l'identifiant du jeune, ou null.
 * Un second appel avec le même jeton renvoie toujours null (usage unique).
 */
export async function consommerLienMagique(
  prisma: ClientBase,
  jeton: string,
  maintenant: Date,
): Promise<string | null> {
  const tokenHash = sha256(jeton);
  const resultat = await prisma.magicLink.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: maintenant } },
    data: { usedAt: maintenant },
  });
  if (resultat.count === 0) return null;
  const lien = await prisma.magicLink.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });
  return lien?.userId ?? null;
}

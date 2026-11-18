// RG-01 : aucune donnée enregistrée avant le consentement.
// RG-02 : 18 ans minimum pour créer un profil.
// Le profil n'est créé qu'avec les deux conditions réunies, en une seule écriture.
import type { Canal, Pays } from "@sentya/db";
import type { Contexte } from "../contexte";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { hacherIdentifiant } from "../confidentialite/hachage";

export class ConsentementRequisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsentementRequisError";
  }
}

export interface DemandeCreationProfil {
  canal: Canal;
  idCanal: string;
  pays: Pays;
  consentement: boolean;
  majeur: boolean;
  sourceAcquisition?: string | null;
  prenom?: string | null;
}

/** Code d'acquisition du lien profond : lettres, chiffres, tirets, 20 caractères maximum. */
export function nettoyerSourceAcquisition(source: string | null | undefined): string | null {
  if (!source) return null;
  const propre = source
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 20);
  return propre.length > 0 ? propre : null;
}

/** Crée le profil (ou renvoie celui qui existe déjà pour ce compte). */
export async function creerProfil(ctx: Contexte, demande: DemandeCreationProfil) {
  if (!demande.consentement) {
    throw new ConsentementRequisError(
      "Consentement absent : aucune donnee ne peut etre enregistree.",
    );
  }
  if (!demande.majeur) {
    throw new ConsentementRequisError("Age non confirme : aucun profil ne peut etre cree.");
  }
  const maintenant = ctx.horloge.maintenant();
  const telegramId = demande.canal === "TELEGRAM" ? BigInt(demande.idCanal) : null;
  const userHash = hacherIdentifiant(demande.canal, demande.idCanal, ctx.sel);

  const existant = await ctx.prisma.user.findUnique({ where: { userHash } });
  if (existant) return { user: existant, cree: false };

  const prenom = demande.prenom?.trim().slice(0, 40) || null;
  const user = await ctx.prisma.user.create({
    data: {
      telegramId,
      userHash,
      canal: demande.canal,
      pays: demande.pays,
      sourceAcquisition: nettoyerSourceAcquisition(demande.sourceAcquisition),
      prenom,
      consentAt: maintenant,
      ageConfirmed: true,
      lastActiveAt: maintenant,
      createdAt: maintenant,
    },
  });
  await enregistrerEvenement(ctx.prisma, {
    type: EVENEMENTS.PROFIL_CREE,
    userHash,
    canal: demande.canal,
    payload: { pays: demande.pays, source: user.sourceAcquisition ?? "direct" },
    date: maintenant,
  });
  return { user, cree: true };
}

/** Retrouve un profil à partir de l'identifiant de canal. */
export async function trouverProfil(ctx: Contexte, canal: Canal, idCanal: string) {
  return ctx.prisma.user.findUnique({
    where: { userHash: hacherIdentifiant(canal, idCanal, ctx.sel) },
  });
}

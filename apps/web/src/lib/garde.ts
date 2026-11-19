// Gardes serveur : chaque page protégée ET chaque action les appellent.
// Le rôle, l'état actif et la double authentification sont relus en base à chaque appel.
import "server-only";
import { getPrisma } from "@sentya/db";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { deciderAccesAdmin, deciderAccesPartenaire, type Permission } from "./roles";
import { lireSessionBrute, type InfosSession } from "./session";

export async function sessionCourante(): Promise<InfosSession | null> {
  const session = await auth();
  return lireSessionBrute(session?.user);
}

export interface AdminConnecte {
  id: string;
  email: string;
  role: "ADMIN" | "CURATEUR";
}

/** Exige un compte du back-office actif, avec double authentification, ayant la permission. */
export async function exigerAdmin(permission: Permission): Promise<AdminConnecte> {
  const session = await sessionCourante();
  const compte =
    session && session.role !== "PARTENAIRE"
      ? await getPrisma().adminUser.findUnique({
          where: { id: session.id },
          select: { id: true, email: true, role: true, actif: true, totpActive: true },
        })
      : null;
  const decision = deciderAccesAdmin(session, compte, permission);
  if (decision.type === "connexion" || !compte) redirect("/admin/connexion");
  if (decision.type === "double_authentification") redirect("/admin/2fa");
  if (decision.type === "refuse") redirect("/admin/acces-refuse");
  return { id: compte.id, email: compte.email, role: decision.role };
}

/** Pour la page d'enrôlement : compte actif connecté, avec ou sans code TOTP. */
export async function exigerAdminPourEnrolement() {
  const session = await sessionCourante();
  if (!session || session.role === "PARTENAIRE") redirect("/admin/connexion");
  const compte = await getPrisma().adminUser.findUnique({ where: { id: session.id } });
  if (!compte || !compte.actif) redirect("/admin/connexion");
  return { session, compte };
}

/** Exige un compte partenaire. Avec `valide`, l'organisation doit aussi être validée. */
export async function exigerPartenaire(options: { valide?: boolean } = {}) {
  const session = await sessionCourante();
  const compte =
    session && session.role === "PARTENAIRE"
      ? await getPrisma().partenaireCompte.findUnique({
          where: { id: session.id },
          include: { partenaire: true },
        })
      : null;
  const decision = deciderAccesPartenaire(session, compte);
  if (decision.type !== "autorise" || !compte) redirect("/partenaire/connexion");
  if (options.valide && compte.partenaire.statutValidation !== "VALIDE") redirect("/partenaire");
  return { compteId: compte.id, email: compte.email, partenaire: compte.partenaire };
}

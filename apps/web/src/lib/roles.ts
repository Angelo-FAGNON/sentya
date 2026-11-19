// Rôles et permissions. Logique pure (sans Next ni base), testée unitairement.
// ADMIN peut tout faire. CURATEUR gère le référentiel, les signalements, la revue qualité
// et le tableau de bord. PARTENAIRE n'accède qu'à l'espace partenaire.

export const ROLES = ["ADMIN", "CURATEUR", "PARTENAIRE"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "tableau",
  "referentiel",
  "signalements",
  "revue",
  "partenaires",
  "utilisateurs",
  "journal",
  "espace_partenaire",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRICE: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "tableau",
    "referentiel",
    "signalements",
    "revue",
    "partenaires",
    "utilisateurs",
    "journal",
  ],
  CURATEUR: ["tableau", "referentiel", "signalements", "revue"],
  PARTENAIRE: ["espace_partenaire"],
};

export function aLaPermission(role: Role, permission: Permission): boolean {
  return MATRICE[role].includes(permission);
}

/** État d'un compte du back-office relu en base à chaque requête. */
export interface CompteAdminEnBase {
  id: string;
  role: "ADMIN" | "CURATEUR";
  actif: boolean;
  totpActive: boolean;
}

/** Contenu minimal de la session, tel que relu depuis le jeton. */
export interface SessionMinimale {
  id: string;
  role: Role;
  totpRequis: boolean;
}

export type DecisionAcces =
  | { type: "autorise"; role: "ADMIN" | "CURATEUR" }
  | { type: "connexion" }
  | { type: "double_authentification" }
  | { type: "refuse" };

/**
 * Décide de l'accès à une page ou une action du back-office.
 * Le rôle, l'état actif et la double authentification viennent de la base, jamais du jeton seul.
 * Une session ouverte sans code TOTP (totpRequis) ne donne accès qu'à l'enrôlement.
 */
export function deciderAccesAdmin(
  session: SessionMinimale | null,
  compte: CompteAdminEnBase | null,
  permission: Permission,
): DecisionAcces {
  if (!session || session.role === "PARTENAIRE") return { type: "connexion" };
  if (!compte || compte.id !== session.id || !compte.actif) return { type: "connexion" };
  if (session.totpRequis || !compte.totpActive) return { type: "double_authentification" };
  if (!aLaPermission(compte.role, permission)) return { type: "refuse" };
  return { type: "autorise", role: compte.role };
}

/** Accès à l'espace partenaire : session partenaire dont le compte existe toujours. */
export function deciderAccesPartenaire(
  session: SessionMinimale | null,
  compte: { id: string; partenaireId: string } | null,
): { type: "autorise"; partenaireId: string } | { type: "connexion" } {
  if (!session || session.role !== "PARTENAIRE") return { type: "connexion" };
  if (!compte || compte.id !== session.id) return { type: "connexion" };
  return { type: "autorise", partenaireId: compte.partenaireId };
}

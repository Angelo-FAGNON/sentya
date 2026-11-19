// Valeurs des énumérations de la base, avec leurs libellés français.
// Import de types seulement : ce module reste utilisable dans les tests sans client Prisma.
import type {
  CategorieFraude,
  Pays,
  RoleAdmin,
  Statut,
  StatutValidation,
  TypeMotif,
  TypePartenaire,
  Voie,
} from "@sentya/db";

export const PAYS = ["BJ", "TG"] as const satisfies readonly Pays[];
export const STATUTS = [
  "BROUILLON",
  "A_VERIFIER",
  "VERIFIEE",
  "SUSPENDUE",
] as const satisfies readonly Statut[];
export const VOIES = [
  "EMPLOI",
  "FORMATION_CERTIFICATION",
  "AUTO_EMPLOI",
] as const satisfies readonly Voie[];
export const TYPES_MOTIF = ["MOT_CLE", "REGEX"] as const satisfies readonly TypeMotif[];
export const CATEGORIES_FRAUDE = [
  "FRAIS_CANDIDAT",
  "PAIEMENT_ENTRETIEN",
  "WHATSAPP_SEUL",
  "SALAIRE_IRREALISTE",
  "AUTRE",
] as const satisfies readonly CategorieFraude[];
export const TYPES_PARTENAIRE = [
  "CENTRE_FORMATION",
  "EMPLOYEUR",
] as const satisfies readonly TypePartenaire[];
export const ROLES_ADMIN = ["CURATEUR", "ADMIN"] as const satisfies readonly RoleAdmin[];

export const LIBELLE_PAYS: Record<Pays, string> = { BJ: "Bénin", TG: "Togo" };

export const LIBELLE_STATUT: Record<Statut, string> = {
  BROUILLON: "Brouillon",
  A_VERIFIER: "À vérifier",
  VERIFIEE: "Vérifiée",
  SUSPENDUE: "Suspendue",
};

export const LIBELLE_VOIE: Record<Voie, string> = {
  EMPLOI: "Emploi",
  FORMATION_CERTIFICATION: "Formation ou certification",
  AUTO_EMPLOI: "Propre activité",
};

export const LIBELLE_TYPE_MOTIF: Record<TypeMotif, string> = {
  MOT_CLE: "Mot-clé",
  REGEX: "Expression régulière",
};

export const LIBELLE_CATEGORIE_FRAUDE: Record<CategorieFraude, string> = {
  FRAIS_CANDIDAT: "Frais demandés au candidat",
  PAIEMENT_ENTRETIEN: "Paiement pour un entretien",
  WHATSAPP_SEUL: "Contact uniquement par WhatsApp",
  SALAIRE_IRREALISTE: "Salaire irréaliste",
  AUTRE: "Autre",
};

export const LIBELLE_TYPE_PARTENAIRE: Record<TypePartenaire, string> = {
  CENTRE_FORMATION: "Centre de formation",
  EMPLOYEUR: "Employeur",
};

export const LIBELLE_VALIDATION: Record<StatutValidation, string> = {
  EN_ATTENTE: "En attente",
  VALIDE: "Validé",
  REFUSE: "Refusé",
};

export const LIBELLE_ROLE: Record<RoleAdmin, string> = {
  ADMIN: "Administrateur",
  CURATEUR: "Curateur",
};

// Schémas zod de tous les formulaires. Logique pure, testée unitairement.
// Les messages d'erreur sont en français et disent comment corriger.
import { z } from "zod";
import {
  CATEGORIES_FRAUDE,
  PAYS,
  ROLES_ADMIN,
  STATUTS,
  TYPES_MOTIF,
  TYPES_PARTENAIRE,
  VOIES,
} from "./valeurs";

// ---------------------------------------------------------------------------
// Briques communes
// ---------------------------------------------------------------------------

const texte = (max = 500) =>
  z
    .string({ error: "Ce champ est obligatoire." })
    .trim()
    .min(1, "Ce champ est obligatoire.")
    .max(max, `${max} caractères au maximum.`);

const texteLong = (max = 5000) => texte(max);

/** Champ vide accepté, transformé en null. */
const texteOptionnel = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au maximum.`)
    .optional()
    .transform((v) => (v ? v : null));

const idOptionnel = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

/** Identifiant lisible : minuscules, chiffres et tirets (ex. "bj-mecanique-moto"). */
export const identifiantLisible = z
  .string({ error: "L'identifiant est obligatoire." })
  .trim()
  .min(2, "L'identifiant est obligatoire.")
  .max(80, "80 caractères au maximum.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Utilise seulement des minuscules sans accents, des chiffres et des tirets.",
  );

export function estUrlHttp(valeur: string): boolean {
  try {
    const url = new URL(valeur);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Source obligatoire de toute fiche (RG-04) : une adresse http ou https. */
export const urlSource = z
  .string({ error: "La source est obligatoire." })
  .trim()
  .min(1, "La source est obligatoire.")
  .max(1000, "1000 caractères au maximum.")
  .refine(estUrlHttp, "Indique une adresse web complète, qui commence par http:// ou https://.");

/** Date saisie au format AAAA-MM-JJ (champ date HTML). Vide : null. Midi, heure locale (UTC+1). */
export const dateOptionnelle = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Date invalide. Format attendu : JJ/MM/AAAA." });
      return z.NEVER;
    }
    const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const date = new Date(Date.UTC(annee, mois - 1, jour, 11));
    if (date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) {
      ctx.addIssue({ code: "custom", message: "Cette date n'existe pas." });
      return z.NEVER;
    }
    return date;
  });

/** Case à cocher HTML : présente ("on") ou absente. */
export const caseACocher = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const ouiNon = z
  .enum(["oui", "non"], { error: "Choisis oui ou non." })
  .transform((v) => v === "oui");

const entierOptionnel = (min: number, max: number) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const nettoye = v.replace(/[\s.]/g, "");
      if (!/^\d+$/.test(nettoye)) {
        ctx.addIssue({ code: "custom", message: "Indique un nombre entier, sans lettres." });
        return z.NEVER;
      }
      const n = Number(nettoye);
      if (n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Nombre entre ${min} et ${max}.` });
        return z.NEVER;
      }
      return n;
    });

const entier = (min: number, max: number) =>
  z.coerce
    .number({ error: "Indique un nombre." })
    .int("Indique un nombre entier.")
    .min(min, `Minimum : ${min}.`)
    .max(max, `Maximum : ${max}.`);

const email = z
  .string({ error: "L'e-mail est obligatoire." })
  .trim()
  .toLowerCase()
  .pipe(z.email("Adresse e-mail invalide.").max(200));

const pays = z.enum(PAYS, { error: "Choisis un pays." });
const statut = z.enum(STATUTS, { error: "Choisis un statut." });

/** Champs communs à toute fiche du référentiel (RG-04). */
const champsFiche = {
  pays,
  sourceUrl: urlSource,
  verifieLe: dateOptionnelle,
  statut,
  /** Case « Je viens de vérifier à la source » : statut VERIFIEE et date du jour. */
  verifieeAujourdhui: caseACocher,
};

// ---------------------------------------------------------------------------
// Connexion et comptes
// ---------------------------------------------------------------------------

export const schemaConnexionAdmin = z.object({
  email,
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire.").max(200),
  code: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.replace(/\s/g, "") : null)),
});

export const schemaConnexionPartenaire = z.object({
  email,
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire.").max(200),
});

export const MOT_DE_PASSE_MIN = 12;

const nouveauMotDePasse = z
  .string({ error: "Le mot de passe est obligatoire." })
  .min(MOT_DE_PASSE_MIN, `${MOT_DE_PASSE_MIN} caractères au minimum.`)
  .max(200, "200 caractères au maximum.");

export const schemaCodeTotp = z.object({
  code: z
    .string({ error: "Saisis le code à 6 chiffres." })
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Saisis le code à 6 chiffres affiché par ton application.")),
});

export const schemaInscriptionPartenaire = z
  .object({
    type: z.enum(TYPES_PARTENAIRE, { error: "Choisis le type d'organisation." }),
    nom: texte(200),
    pays,
    contactOfficiel: texte(300),
    email,
    motDePasse: nouveauMotDePasse,
    confirmation: z.string(),
  })
  .refine((d) => d.motDePasse === d.confirmation, {
    path: ["confirmation"],
    message: "Les deux mots de passe ne sont pas identiques.",
  });

export const schemaNouvelAdmin = z.object({
  email,
  motDePasse: nouveauMotDePasse,
  role: z.enum(ROLES_ADMIN, { error: "Choisis un rôle." }),
});

// ---------------------------------------------------------------------------
// Référentiel
// ---------------------------------------------------------------------------

export const schemaCompetence = z.object({
  id: identifiantLisible,
  libelle: texte(200),
  synonymes: z
    .string()
    .optional()
    .transform((v) =>
      [
        ...new Set(
          (v ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ].slice(0, 50),
    ),
  domaine: texte(100),
});

export const schemaMetier = z.object({
  id: identifiantLisible,
  libelle: texte(200),
  description: texteLong(),
  ouExiste: texte(1000),
  ...champsFiche,
});

/** Lien métier et compétence : poids de 1 (utile) à 3 (essentielle), 0 pour retirer. */
export const schemaLienCompetence = z.object({
  competenceId: identifiantLisible,
  poids: entier(0, 3),
});

export const schemaFormation = z.object({
  intitule: texte(300),
  organisme: texte(300),
  dureeIndicative: texte(200),
  coutIndicatifFcfa: entierOptionnel(0, 100_000_000),
  ...champsFiche,
});

export const schemaProgramme = z.object({
  nom: texte(200),
  description: texteLong(),
  publicCible: texte(1000),
  conditions: texte(2000),
  contact: texte(500),
  voies: z
    .array(z.enum(VOIES), { error: "Coche au moins une voie." })
    .min(1, "Coche au moins une voie."),
  ...champsFiche,
});

/** Contenu d'une opportunité saisi par un partenaire. Le pays vient de son organisation. */
export const schemaOpportunitePartenaire = z.object({
  titre: texte(200),
  description: texteLong(),
  lieu: texte(200),
  contact: texte(300),
  sourceUrl: urlSource,
  metierId: idOptionnel,
  dateLimite: dateOptionnelle,
});

/** Opportunité saisie par un curateur : il choisit aussi le pays et, si besoin, le partenaire. */
export const schemaOpportuniteCurateur = schemaOpportunitePartenaire.extend({
  pays,
  partenaireId: idOptionnel,
  /** Statut souhaité. VERIFIEE passe toujours par la vérification du noyau (RG-05). */
  statut: statut.optional().default("BROUILLON"),
  verifieeAujourdhui: caseACocher,
});

export const schemaModeleEtape = z.object({
  metierId: identifiantLisible,
  voie: z.enum(VOIES, { error: "Choisis une voie." }),
  ordre: entier(1, 3),
  titre: texte(200),
  details: texteLong(2000),
  delaiJours: entier(0, 365),
  programmeId: idOptionnel,
  formationId: idOptionnel,
  sourceUrl: urlSource,
  verifieLe: dateOptionnelle,
  statut,
  verifieeAujourdhui: caseACocher,
});

/** Mêmes options que le noyau (regles/fraude.ts) : insensible à la casse, Unicode. */
export const DRAPEAUX_REGEX_FRAUDE = "iu";

export function regexCompile(motif: string): boolean {
  try {
    new RegExp(motif, DRAPEAUX_REGEX_FRAUDE);
    return true;
  } catch {
    return false;
  }
}

export const schemaRegleFraude = z
  .object({
    motif: texte(500),
    typeMotif: z.enum(TYPES_MOTIF, { error: "Choisis le type de motif." }),
    categorie: z.enum(CATEGORIES_FRAUDE, { error: "Choisis une catégorie." }),
    description: texte(300),
    bloquante: caseACocher,
    actif: caseACocher,
  })
  .superRefine((d, ctx) => {
    if (d.typeMotif === "REGEX" && !regexCompile(d.motif)) {
      ctx.addIssue({
        code: "custom",
        path: ["motif"],
        message: "Cette expression régulière est invalide. Corrige-la avant d'enregistrer.",
      });
    }
  });

// ---------------------------------------------------------------------------
// Revue qualité
// ---------------------------------------------------------------------------

export const schemaNoteRevue = z.object({
  pistesCorrectes: ouiNon,
  inventionDetectee: ouiNon,
  commentaire: texteOptionnel(1000),
});

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

/** Transforme un FormData en objet. Les clés listées dans `multiples` deviennent des tableaux. */
export function lireFormulaire(
  formData: FormData,
  multiples: readonly string[] = [],
): Record<string, unknown> {
  const objet: Record<string, unknown> = {};
  for (const [cle, valeur] of formData.entries()) {
    if (cle.startsWith("$ACTION")) continue;
    if (typeof valeur !== "string") continue;
    if (multiples.includes(cle)) {
      objet[cle] = [...((objet[cle] as string[] | undefined) ?? []), valeur];
    } else {
      objet[cle] = valeur;
    }
  }
  for (const cle of multiples) objet[cle] ??= [];
  return objet;
}

/** Premier message d'erreur par champ, pour l'affichage sous chaque champ. */
export function erreursParChamp(erreur: z.ZodError): Record<string, string> {
  const resultat: Record<string, string> = {};
  for (const probleme of erreur.issues) {
    const cle = probleme.path.map(String).join(".") || "_formulaire";
    resultat[cle] ??= probleme.message;
  }
  return resultat;
}

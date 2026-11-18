// Outils des tests d'intégration : contexte avec base réelle, IA factice et horloge simulée.
import { creerClientPrisma, type PrismaClient } from "@sentya/db";
import type { Contexte } from "../../src/contexte";
import { HorlogeSimulee } from "../../src/horloge";
import { FournisseurFactice, type Repondeur } from "../../src/ia/factice";
import { journalSilencieux } from "../../src/journal";
import { creerProfil } from "../../src/regles/consentement";

let client: PrismaClient | undefined;

export function prismaTest(): PrismaClient {
  client ??= creerClientPrisma(process.env.TEST_DATABASE_URL);
  return client;
}

export const DEPART = "2026-11-18T09:00:00.000Z";

export function contexteTest(repondeur: Repondeur = () => ({}), depart = DEPART) {
  const ia = new FournisseurFactice(repondeur);
  const horloge = new HorlogeSimulee(depart);
  const ctx: Contexte = {
    prisma: prismaTest(),
    ia,
    horloge,
    journal: journalSilencieux,
    sel: "sel-de-test-suffisamment-long",
    appUrl: "https://sentya.test",
  };
  return { ctx, ia, horloge };
}

/** Vide toutes les tables (sauf l'historique des migrations). */
export async function viderBase(prisma: PrismaClient = prismaTest()) {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (tables.length === 0) return;
  const liste = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${liste} RESTART IDENTITY CASCADE`);
}

const VOIES = ["EMPLOI", "FORMATION_CERTIFICATION", "AUTO_EMPLOI"] as const;

/** Référentiel minimal : 6 compétences, 4 métiers au Bénin, 1 au Togo, programmes et règles. */
export async function creerReferentiel(prisma: PrismaClient = prismaTest()) {
  const competences = [
    ["couture", "Couture", ["coudre", "je couds les habits"]],
    ["retouche", "Retouche de vêtements", ["retoucher"]],
    ["vente", "Vente", ["vendre au marché", "commerce"]],
    ["coiffure", "Coiffure", ["tresser", "faire les tresses"]],
    ["mecanique-moto", "Mécanique moto", ["réparer les motos"]],
    ["accueil-client", "Accueil des clients", ["accueillir"]],
  ] as const;
  for (const [id, libelle, synonymes] of competences) {
    await prisma.competence.create({
      data: { id, libelle, synonymes: [...synonymes], domaine: "test" },
    });
  }

  await prisma.programme.create({
    data: {
      id: "bj-azoli",
      pays: "BJ",
      nom: "Azôli",
      description: "Programme d'insertion des jeunes.",
      publicCible: "Jeunes peu qualifiés",
      conditions: "À vérifier par le curateur",
      contact: "À vérifier par le curateur",
      voies: ["EMPLOI", "AUTO_EMPLOI"],
      sourceUrl: "https://sica.anpe.bj",
      statut: "A_VERIFIER",
    },
  });
  await prisma.formation.create({
    data: {
      id: "bj-cqp-couture",
      pays: "BJ",
      intitule: "Apprentissage menant au CQP",
      organisme: "Organisme public",
      dureeIndicative: "À vérifier par le curateur",
      coutIndicatifFcfa: null,
      sourceUrl: "https://exemple-officiel.bj/cqp",
      statut: "A_VERIFIER",
    },
  });

  const metiers = [
    [
      "bj-couture",
      "BJ",
      "Couturier",
      [
        ["couture", 3],
        ["retouche", 2],
        ["vente", 1],
      ],
    ],
    [
      "bj-vente",
      "BJ",
      "Vendeur",
      [
        ["vente", 3],
        ["accueil-client", 2],
      ],
    ],
    [
      "bj-coiffure",
      "BJ",
      "Coiffeur",
      [
        ["coiffure", 3],
        ["accueil-client", 1],
      ],
    ],
    ["bj-mecanique-moto", "BJ", "Mécanicien moto", [["mecanique-moto", 3]]],
    ["tg-couture", "TG", "Couturier", [["couture", 3]]],
  ] as const;
  for (const [id, pays, libelle, liens] of metiers) {
    await prisma.metier.create({
      data: {
        id,
        pays,
        libelle,
        description: `${libelle} : métier de démonstration.`,
        ouExiste: "Grandes villes. À vérifier par le curateur.",
        sourceUrl: "https://sica.anpe.bj",
        statut: "A_VERIFIER",
        competences: { create: liens.map(([competenceId, poids]) => ({ competenceId, poids })) },
      },
    });
    for (const voie of VOIES) {
      for (const ordre of [1, 2, 3]) {
        await prisma.modeleEtape.create({
          data: {
            metierId: id,
            voie,
            ordre,
            titre: `Étape ${ordre} ${voie} ${id}`,
            details: `Détails de l'étape ${ordre}.`,
            delaiJours: ordre * 7,
            programmeId:
              pays === "BJ" && voie !== "FORMATION_CERTIFICATION" && ordre === 1
                ? "bj-azoli"
                : null,
            formationId:
              id === "bj-couture" && voie === "FORMATION_CERTIFICATION" && ordre === 2
                ? "bj-cqp-couture"
                : null,
            sourceUrl: "https://sica.anpe.bj",
            statut: "A_VERIFIER",
          },
        });
      }
    }
  }
  await prisma.metierFormation.create({
    data: { metierId: "bj-couture", formationId: "bj-cqp-couture" },
  });

  await prisma.regleFraude.createMany({
    data: [
      {
        id: "frais",
        motif: "frais de dossier",
        typeMotif: "MOT_CLE",
        categorie: "FRAIS_CANDIDAT",
        description: "Frais demandés",
        bloquante: true,
      },
      {
        id: "whatsapp",
        motif: "uniquement (par|sur) whatsapp",
        typeMotif: "REGEX",
        categorie: "WHATSAPP_SEUL",
        description: "WhatsApp seul",
        bloquante: false,
      },
    ],
  });
}

/** Crée un jeune consentant et majeur. */
export async function creerJeune(ctx: Contexte, idCanal = "1001", prenom: string | null = "Afi") {
  const { user } = await creerProfil(ctx, {
    canal: "TELEGRAM",
    idCanal,
    pays: "BJ",
    consentement: true,
    majeur: true,
    prenom,
  });
  return user;
}

/** Crée un partenaire validé et une opportunité vérifiée. */
export async function creerOpportuniteVerifiee(
  prisma: PrismaClient,
  options: { metierId?: string; partenaireValide?: boolean; verifieLe?: Date } = {},
) {
  const partenaire = await prisma.partenaire.create({
    data: {
      type: "EMPLOYEUR",
      nom: "Atelier Exemple",
      pays: "BJ",
      contactOfficiel: "contact@atelier.example",
      statutValidation: options.partenaireValide === false ? "EN_ATTENTE" : "VALIDE",
    },
  });
  return prisma.opportunite.create({
    data: {
      partenaireId: partenaire.id,
      pays: "BJ",
      metierId: options.metierId ?? "bj-couture",
      titre: "Apprenti couturier",
      description: "Atelier de couture recrute un apprenti.",
      lieu: "Cotonou",
      contact: "contact@atelier.example",
      sourceUrl: "https://atelier.example/offre",
      statut: "VERIFIEE",
      verifieLe: options.verifieLe ?? new Date("2026-11-01T10:00:00Z"),
    },
  });
}

/** Réponse factice de l'IA : choisit les candidats dans l'ordre reçu (déterministe). */
export function repondeurDeterministe(requete: { version: string; texte: string }): unknown {
  const entree = JSON.parse(requete.texte) as Record<string, unknown>;
  if (requete.version.startsWith("choix-pistes@")) {
    const candidats = entree.candidats as { metierId: string; voiesDisponibles: string[] }[];
    return {
      pistes: candidats.slice(0, 3).map((c) => ({
        metierId: c.metierId,
        voie: c.voiesDisponibles[0],
        raison: "Ton expérience en couture sert dans ce métier.",
        conditionPrincipale: "Trouver un atelier pour pratiquer.",
      })),
    };
  }
  if (requete.version.startsWith("extraction-competences@")) {
    return {
      competences: [{ id: "couture", preuve: "je couds" }],
      activites: [{ libelle: "couture", dureeMois: 36 }],
    };
  }
  return {};
}

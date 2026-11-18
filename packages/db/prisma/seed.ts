// Seed de Sentya : jeu de démonstration du référentiel (hypothèse H1).
// - Compétences, métiers (Bénin et Togo), programmes publics, formations, modèles d'étapes,
//   règles de fraude et compte administrateur.
// - Aucune opportunité : elles doivent être vérifiées par un curateur (hypothèse H2).
// - Idempotent : chaque écriture est un upsert sur un identifiant stable. Une nouvelle
//   exécution met à jour les textes mais conserve le statut et la date de vérification
//   posés par un curateur.
// Lancement : pnpm exec prisma db seed (voir prisma.config.ts).
import argon2 from "argon2";
import { creerClientPrisma } from "../src/index";
import { COMPETENCES } from "./seed-data/competences";
import { DUREE_INDICATIVE, FORMATIONS } from "./seed-data/formations";
import { METIERS } from "./seed-data/metiers";
import { genererModeles, VOIES } from "./seed-data/modeles-etapes";
import { PROGRAMMES } from "./seed-data/programmes";
import { REGLES_FRAUDE } from "./seed-data/regles-fraude";

/** Sortie console du seed (la règle no-console du dépôt vise le code applicatif). */
function afficher(ligne: string): void {
  process.stdout.write(`${ligne}\n`);
}

function afficherErreur(ligne: string): void {
  process.stderr.write(`${ligne}\n`);
}

const STATUT_SEED = "A_VERIFIER" as const;
const LONGUEUR_MIN_MOT_DE_PASSE = 12;

// ---------------------------------------------------------------------------
// Contrôles avant écriture (aucune ligne n'est écrite si un contrôle échoue)
// ---------------------------------------------------------------------------

// Copies des règles de @sentya/core (texte.ts) : le paquet db ne dépend pas de core.
function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decouperPhrases(texte: string): string[] {
  return texte
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function compterMots(phrase: string): number {
  return phrase.split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;
}

const MOTS_PAR_PHRASE_MAX = 15;
const MOTS_PAR_TITRE_MAX = 8;

// Mots trop courants pour identifier une compétence à eux seuls (repli sans IA).
const MOTS_GENERIQUES = new Set(
  [
    "aide",
    "aider",
    "aime",
    "avec",
    "bien",
    "dans",
    "fais",
    "faire",
    "parle",
    "parler",
    "peux",
    "pour",
    "sais",
    "savoir",
    "suis",
    "tous",
    "tout",
    "travail",
    "travaille",
    "travailler",
  ].map(normaliser),
);

function verifierDonnees(modeles: ReturnType<typeof genererModeles>): void {
  const erreurs: string[] = [];
  const texteAffiche = (contexte: string, texte: string) => {
    for (const phrase of decouperPhrases(texte)) {
      if (compterMots(phrase) > MOTS_PAR_PHRASE_MAX) {
        erreurs.push(`${contexte} : phrase de plus de ${MOTS_PAR_PHRASE_MAX} mots (« ${phrase} »)`);
      }
    }
  };
  const unicite = (nom: string, ids: string[]) => {
    const vus = new Set<string>();
    for (const id of ids) {
      if (vus.has(id)) erreurs.push(`${nom} : identifiant en double ${id}`);
      vus.add(id);
    }
  };

  // Compétences
  unicite(
    "Competence",
    COMPETENCES.map((c) => c.id),
  );
  const idsCompetences = new Set(COMPETENCES.map((c) => c.id));
  for (const c of COMPETENCES) {
    if (c.synonymes.length < 3 || c.synonymes.length > 6) {
      erreurs.push(`Competence ${c.id} : ${c.synonymes.length} synonymes (3 à 6 attendus)`);
    }
    for (const s of c.synonymes) {
      const motsLongs = normaliser(s)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((m) => m.length >= 4);
      if (motsLongs.length > 0 && motsLongs.every((m) => MOTS_GENERIQUES.has(m))) {
        erreurs.push(`Competence ${c.id} : synonyme trop générique (« ${s} »)`);
      }
    }
  }

  // Métiers
  unicite(
    "Metier",
    METIERS.map((m) => m.id),
  );
  for (const pays of ["BJ", "TG"] as const) {
    const n = METIERS.filter((m) => m.pays === pays).length;
    if (n < 20) erreurs.push(`Metier : ${n} métiers pour ${pays} (20 au moins)`);
  }
  for (const m of METIERS) {
    texteAffiche(`Metier ${m.id} (description)`, m.description);
    texteAffiche(`Metier ${m.id} (ouExiste)`, m.ouExiste);
    if (m.competences.length < 4 || m.competences.length > 8) {
      erreurs.push(`Metier ${m.id} : ${m.competences.length} compétences (4 à 8 attendues)`);
    }
    unicite(
      `Metier ${m.id} (compétences)`,
      m.competences.map(([id]) => id),
    );
    for (const [id, poids] of m.competences) {
      if (!idsCompetences.has(id)) erreurs.push(`Metier ${m.id} : compétence inconnue ${id}`);
      if (poids < 1 || poids > 3) erreurs.push(`Metier ${m.id} : poids ${poids} hors de 1..3`);
    }
  }

  // Programmes et formations
  unicite(
    "Programme",
    PROGRAMMES.map((p) => p.id),
  );
  for (const p of PROGRAMMES) {
    texteAffiche(`Programme ${p.id} (description)`, p.description);
    texteAffiche(`Programme ${p.id} (publicCible)`, p.publicCible);
    texteAffiche(`Programme ${p.id} (conditions)`, p.conditions);
  }
  unicite(
    "Formation",
    FORMATIONS.map((f) => f.id),
  );
  for (const f of FORMATIONS) texteAffiche(`Formation ${f.id} (intitulé)`, f.intitule);

  // Modèles d'étapes : 3 par couple (métier, voie), délais croissants, références valides.
  const idsProgrammes = new Set(PROGRAMMES.map((p) => p.id));
  const idsFormations = new Set(FORMATIONS.map((f) => f.id));
  const attendus = METIERS.length * VOIES.length * 3;
  if (modeles.length !== attendus) {
    erreurs.push(`ModeleEtape : ${modeles.length} modèles (${attendus} attendus)`);
  }
  unicite(
    "ModeleEtape",
    modeles.map((e) => `${e.metierId}/${e.voie}/${e.ordre}`),
  );
  for (const e of modeles) {
    const ctx = `ModeleEtape ${e.metierId}/${e.voie}/${e.ordre}`;
    if (compterMots(e.titre) > MOTS_PAR_TITRE_MAX) {
      erreurs.push(`${ctx} : titre de plus de ${MOTS_PAR_TITRE_MAX} mots (« ${e.titre} »)`);
    }
    texteAffiche(`${ctx} (titre)`, e.titre);
    texteAffiche(`${ctx} (détails)`, e.details);
    if (decouperPhrases(e.details).length > 2) erreurs.push(`${ctx} : plus de 2 phrases`);
    if (e.programmeId && !idsProgrammes.has(e.programmeId)) {
      erreurs.push(`${ctx} : programme inconnu ${e.programmeId}`);
    }
    if (e.formationId && !idsFormations.has(e.formationId)) {
      erreurs.push(`${ctx} : formation inconnue ${e.formationId}`);
    }
    if (e.ordre > 1) {
      const precedent = modeles.find(
        (x) => x.metierId === e.metierId && x.voie === e.voie && x.ordre === e.ordre - 1,
      );
      if (!precedent || precedent.delaiJours >= e.delaiJours) {
        erreurs.push(`${ctx} : délai non croissant`);
      }
    }
  }

  // Règles de fraude : motifs normalisés, expressions valides, exemples cohérents.
  unicite(
    "RegleFraude",
    REGLES_FRAUDE.map((r) => r.id),
  );
  for (const r of REGLES_FRAUDE) {
    let teste: (texte: string) => boolean;
    if (r.typeMotif === "MOT_CLE") {
      if (r.motif !== normaliser(r.motif)) {
        erreurs.push(`RegleFraude ${r.id} : le mot-clé doit être normalisé (« ${r.motif} »)`);
      }
      teste = (texte) => texte.includes(r.motif);
    } else {
      try {
        const expression = new RegExp(r.motif);
        teste = (texte) => expression.test(texte);
      } catch (erreur) {
        erreurs.push(`RegleFraude ${r.id} : expression invalide (${String(erreur)})`);
        continue;
      }
    }
    for (const exemple of r.exemplesPositifs) {
      if (!teste(normaliser(exemple))) {
        erreurs.push(`RegleFraude ${r.id} : exemple non détecté (« ${exemple} »)`);
      }
    }
    for (const exemple of r.exemplesNegatifs) {
      if (teste(normaliser(exemple))) {
        erreurs.push(`RegleFraude ${r.id} : faux positif (« ${exemple} »)`);
      }
    }
  }

  if (erreurs.length > 0) {
    throw new Error(`Données du seed invalides :\n- ${erreurs.join("\n- ")}`);
  }
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

type Client = ReturnType<typeof creerClientPrisma>;

async function seederCompetences(prisma: Client): Promise<void> {
  for (const c of COMPETENCES) {
    const donnees = { libelle: c.libelle, synonymes: c.synonymes, domaine: c.domaine };
    await prisma.competence.upsert({
      where: { id: c.id },
      create: { id: c.id, ...donnees },
      update: donnees,
    });
  }
}

async function seederMetiers(prisma: Client): Promise<number> {
  let liens = 0;
  for (const m of METIERS) {
    const donnees = {
      pays: m.pays,
      libelle: m.libelle,
      description: m.description,
      ouExiste: m.ouExiste,
      sourceUrl: m.sourceUrl,
    };
    await prisma.metier.upsert({
      where: { id: m.id },
      create: { id: m.id, ...donnees, statut: STATUT_SEED, verifieLe: null },
      update: donnees,
    });
    for (const [competenceId, poids] of m.competences) {
      await prisma.metierCompetence.upsert({
        where: { metierId_competenceId: { metierId: m.id, competenceId } },
        create: { metierId: m.id, competenceId, poids },
        update: { poids },
      });
      liens += 1;
    }
  }
  return liens;
}

async function seederProgrammes(prisma: Client): Promise<void> {
  for (const p of PROGRAMMES) {
    const donnees = {
      pays: p.pays,
      nom: p.nom,
      description: p.description,
      publicCible: p.publicCible,
      conditions: p.conditions,
      contact: p.contact,
      voies: p.voies,
      sourceUrl: p.sourceUrl,
    };
    await prisma.programme.upsert({
      where: { id: p.id },
      create: { id: p.id, ...donnees, statut: STATUT_SEED, verifieLe: null },
      update: donnees,
    });
  }
}

async function seederFormations(prisma: Client): Promise<number> {
  let liens = 0;
  for (const f of FORMATIONS) {
    const donnees = {
      pays: f.pays,
      intitule: f.intitule,
      organisme: f.organisme,
      dureeIndicative: DUREE_INDICATIVE,
      coutIndicatifFcfa: null,
      sourceUrl: f.sourceUrl,
    };
    await prisma.formation.upsert({
      where: { id: f.id },
      create: { id: f.id, ...donnees, statut: STATUT_SEED, verifieLe: null },
      update: donnees,
    });
    const metiers = METIERS.filter(
      (m) =>
        m.pays === f.pays &&
        ((f.metiers.familles?.includes(m.famille) ?? false) ||
          (f.metiers.slugs?.some((slug) => m.id === `${m.pays.toLowerCase()}-${slug}`) ?? false)),
    );
    for (const m of metiers) {
      await prisma.metierFormation.upsert({
        where: { metierId_formationId: { metierId: m.id, formationId: f.id } },
        create: { metierId: m.id, formationId: f.id },
        update: {},
      });
      liens += 1;
    }
  }
  return liens;
}

async function seederModeles(
  prisma: Client,
  modeles: ReturnType<typeof genererModeles>,
): Promise<void> {
  for (const e of modeles) {
    const donnees = {
      titre: e.titre,
      details: e.details,
      delaiJours: e.delaiJours,
      programmeId: e.programmeId,
      formationId: e.formationId,
      sourceUrl: e.sourceUrl,
    };
    await prisma.modeleEtape.upsert({
      where: { metierId_voie_ordre: { metierId: e.metierId, voie: e.voie, ordre: e.ordre } },
      create: {
        metierId: e.metierId,
        voie: e.voie,
        ordre: e.ordre,
        ...donnees,
        statut: STATUT_SEED,
        verifieLe: null,
      },
      update: donnees,
    });
  }
}

async function seederReglesFraude(prisma: Client): Promise<void> {
  for (const r of REGLES_FRAUDE) {
    const donnees = {
      motif: r.motif,
      typeMotif: r.typeMotif,
      categorie: r.categorie,
      description: r.description,
      bloquante: r.bloquante,
    };
    await prisma.regleFraude.upsert({
      where: { id: r.id },
      create: { id: r.id, ...donnees, actif: true },
      update: donnees,
    });
  }
}

/**
 * Compte administrateur à partir de ADMIN_EMAIL et ADMIN_PASSWORD.
 * À la création : rôle ADMIN, sans double authentification. Lors d'une nouvelle exécution,
 * le mot de passe et le rôle sont mis à jour, mais la configuration TOTP est conservée.
 */
interface AdminEnv {
  email: string;
  motDePasse: string;
}

/** Lit ADMIN_EMAIL et ADMIN_PASSWORD avant toute écriture (échec si mot de passe trop court). */
function lireAdminEnv(): AdminEnv | null {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const motDePasse = process.env.ADMIN_PASSWORD;
  if (!email || !motDePasse) {
    afficher(
      "Compte administrateur ignoré : ADMIN_EMAIL ou ADMIN_PASSWORD absent de l'environnement.",
    );
    return null;
  }
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    throw new Error(
      `ADMIN_PASSWORD doit contenir au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
    );
  }
  return { email, motDePasse };
}

async function seederAdmin(prisma: Client, admin: AdminEnv | null): Promise<string> {
  if (!admin) return "ignoré";
  const { email, motDePasse } = admin;
  const motDePasseHache = await argon2.hash(motDePasse, { type: argon2.argon2id });
  await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      motDePasseHache,
      role: "ADMIN",
      totpActive: false,
      totpSecret: null,
    },
    update: { motDePasseHache, role: "ADMIN" },
  });
  return email;
}

async function main(): Promise<void> {
  const modeles = genererModeles(METIERS);
  verifierDonnees(modeles);
  const adminEnv = lireAdminEnv();

  const prisma = creerClientPrisma();
  try {
    await seederCompetences(prisma);
    const liensCompetences = await seederMetiers(prisma);
    await seederProgrammes(prisma);
    const liensFormations = await seederFormations(prisma);
    await seederModeles(prisma, modeles);
    await seederReglesFraude(prisma);
    const admin = await seederAdmin(prisma, adminEnv);

    const parPays = (pays: "BJ" | "TG") => METIERS.filter((m) => m.pays === pays).length;
    afficher("Seed terminé :");
    afficher(`- compétences : ${COMPETENCES.length}`);
    afficher(`- métiers : ${METIERS.length} (Bénin ${parPays("BJ")}, Togo ${parPays("TG")})`);
    afficher(`- liens métier-compétence : ${liensCompetences}`);
    afficher(`- programmes : ${PROGRAMMES.length}`);
    afficher(`- formations : ${FORMATIONS.length} (liens métier-formation : ${liensFormations})`);
    afficher(`- modèles d'étapes : ${modeles.length}`);
    afficher(`- règles de fraude : ${REGLES_FRAUDE.length}`);
    afficher(`- administrateur : ${admin}`);
    afficher("- opportunités : 0 (vérification par un curateur obligatoire)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erreur: unknown) => {
  afficherErreur(erreur instanceof Error ? erreur.message : String(erreur));
  process.exitCode = 1;
});

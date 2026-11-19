// Test de bout en bout du parcours du bot avec des mises à jour Telegram simulées.
// Couvre : accueil et consentement (RG-01, RG-02), bilan en texte et en vocal, validation
// des compétences, 3 pistes ancrées, fiche, plan en 3 étapes, PDF, rappels J+3/J+7/J+30
// avec horloge simulée, statuts, /supprimer en deux temps, idempotence, indisponibilité de l'IA.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  executerRappel,
  fr,
  IAIndisponibleError,
  reprendreMessageEnAttente,
  signalerOpportunite,
} from "@sentya/core";
import {
  creerJeune,
  creerOpportuniteVerifiee,
  creerReferentiel,
  viderBase,
} from "../../../packages/core/test/outils/base";
import { creerEnvironnement, repondeurParcours, type Environnement } from "./outils";

let env: Environnement;
beforeEach(async () => {
  await viderBase();
  await creerReferentiel();
  env = creerEnvironnement();
});
afterAll(async () => {
  await env.prisma.$disconnect();
});

const REPONSES_TEXTE = [
  "Je couds des habits pour mon quartier et je vends des pagnes au marché.",
  "Depuis trois ans pour la couture, deux ans pour la vente.",
  "J'aime créer des modèles et parler aux clients.",
  "Abomey-Calavi",
];

/** Consentement et âge : renvoie après la création du profil. */
async function consentir(e: Environnement) {
  await e.jeune.ecrit("/start qr");
  await e.jeune.appuie("pays:BJ:qr");
  await e.jeune.appuie("cons:BJ:qr");
  await e.jeune.appuie("maj:BJ:qr");
}

/** Bilan complet en texte, CV refusé, compétences validées, piste 1 choisie. */
async function allerJusquauPlan(e: Environnement) {
  await consentir(e);
  for (const reponse of REPONSES_TEXTE) await e.jeune.ecrit(reponse);
  await e.jeune.appuie("etudes:aucun");
  await e.jeune.appuie("objectif:EMPLOI");
  await e.jeune.appuie("cv:non");
  await e.jeune.appuie("comp:ok");
  await e.jeune.appuie("voir:1");
  await e.jeune.appuie("choisir:1");
}

describe("parcours complet du bot", () => {
  it("va de /start au plan en 3 étapes, entièrement en texte, sans rien écrire avant le consentement", async () => {
    const { jeune, prisma, nouveauxMessages, textes, boutons } = env;
    const compterDonnees = async () =>
      (await prisma.user.count()) +
      (await prisma.conversationState.count()) +
      (await prisma.bilanReponse.count()) +
      (await prisma.evenementAnalytique.count());

    // EF-01 : 3 messages d'accueil, puis le choix du pays.
    await jeune.ecrit("/start qr");
    let messages = nouveauxMessages();
    expect(textes(messages)).toEqual([...fr.accueil]);
    expect(boutons(messages[2]).map((b) => b.text)).toEqual(["Bénin", "Togo"]);
    expect(await compterDonnees()).toBe(0);

    await jeune.appuie("pays:BJ:qr");
    messages = nouveauxMessages();
    expect(String(messages[0]?.text)).toContain("https://sentya.test/confidentialite");
    expect(boutons(messages[0]).map((b) => b.text)).toEqual(["J'accepte", "Plus tard"]);
    await jeune.appuie("cons:BJ:qr");
    expect(textes(nouveauxMessages())).toEqual([fr.questionAge]);
    // RG-01 : toujours aucune donnée personnelle, seulement les update_id.
    expect(await compterDonnees()).toBe(0);
    expect(await prisma.processedUpdate.count()).toBe(3);

    await jeune.appuie("maj:BJ:qr");
    expect(textes(nouveauxMessages())).toEqual([fr.debutBilan, fr.questions.activites]);
    const user = await prisma.user.findFirstOrThrow();
    expect(user).toMatchObject({
      pays: "BJ",
      sourceAcquisition: "qr",
      ageConfirmed: true,
      prenom: "Afi",
    });

    // EF-02 : une question par message.
    for (const reponse of REPONSES_TEXTE) {
      await jeune.ecrit(reponse);
      expect(nouveauxMessages()).toHaveLength(1);
    }
    await jeune.appuie("etudes:aucun");
    messages = nouveauxMessages();
    expect(boutons(messages[0])).toHaveLength(3);
    await jeune.appuie("objectif:EMPLOI");
    expect(textes(nouveauxMessages())).toEqual([fr.proposerCv]);
    expect(await prisma.bilanReponse.count()).toBe(6);
    expect(await prisma.user.findFirstOrThrow()).toMatchObject({
      ville: "Abomey-Calavi",
      niveauEtudes: "AUCUN_DIPLOME",
      objectif: "EMPLOI",
    });

    // EF-03 : récapitulatif des compétences.
    await jeune.appuie("cv:non");
    messages = nouveauxMessages();
    expect(String(messages.at(-1)?.text)).toMatch(
      /J'ai repéré ces compétences :\n- Couture\n- Vente\nC'est juste \?/,
    );
    expect(boutons(messages.at(-1)).map((b) => b.text)).toEqual(["Oui", "Corriger"]);

    // EF-05 : "Je réfléchis...", puis 3 pistes sourcées et 3 boutons.
    await jeune.appuie("comp:ok");
    messages = nouveauxMessages();
    expect(messages[0]?.text).toBe(fr.jeReflechis);
    expect(messages[1]?.text).toBe(fr.introPistes);
    const pistes = messages.slice(2, 5).map((m) => String(m.text));
    expect(pistes).toHaveLength(3);
    for (const piste of pistes) expect(piste).toMatch(/Source : sica\.anpe\.bj, à vérifier/);
    expect(boutons(messages.at(-1)).map((b) => b.callback_data)).toEqual([
      "voir:1",
      "voir:2",
      "voir:3",
    ]);
    const enBase = await prisma.piste.findMany({ include: { metier: true } });
    expect(enBase.every((p) => p.metier.pays === "BJ")).toBe(true);

    // EF-06 : fiche piste.
    await jeune.appuie("voir:1");
    messages = nouveauxMessages();
    expect(boutons(messages.at(-1)).map((b) => b.text)).toEqual([
      "Choisir cette piste",
      "Retour aux pistes",
    ]);

    // EF-07 : plan en 3 étapes, PDF, une seule action à la fin.
    await jeune.appuie("choisir:1");
    messages = nouveauxMessages();
    expect(messages[0]?.text).toBe(fr.introPlan);
    expect(messages.filter((m) => String(m.text).startsWith("Étape "))).toHaveLength(3);
    expect(String(messages.at(-1)?.text)).toMatch(
      /^Je te rappelle dans 3 jours\. Ta première action/,
    );
    expect(env.appels.filter((a) => a.methode === "sendDocument")).toHaveLength(1);
    const plan = await prisma.plan.findFirstOrThrow({ include: { etapes: true, rappels: true } });
    expect(plan.etapes).toHaveLength(3);
    expect(plan.rappels.map((r) => r.type).sort()).toEqual(["J3", "J30", "J7"]);
    expect(env.planificateur.rappels).toHaveLength(3);

    // Règles d'interface : jamais plus de 3 boutons par message.
    for (const appel of env.appels.filter((a) => a.methode === "sendMessage")) {
      expect(boutons(appel.charge).length).toBeLessThanOrEqual(3);
    }
  });

  it("va jusqu'au plan entièrement en vocal", async () => {
    const { jeune, prisma, ia } = env;
    await consentir(env);
    for (let i = 0; i < 6; i += 1) await jeune.parle();
    expect(ia.appelsPour("transcription")).toHaveLength(6);
    const reponses = await prisma.bilanReponse.findMany();
    expect(reponses).toHaveLength(6);
    expect(reponses.every((r) => r.sourceType === "VOCAL")).toBe(true);
    await jeune.parle();
    await jeune.appuie("comp:ok");
    await jeune.appuie("choisir:1");
    expect(await prisma.plan.count()).toBe(1);
  });

  it("refuse un mineur sans créer de profil (RG-02)", async () => {
    const { jeune, prisma, nouveauxMessages } = env;
    await jeune.ecrit("/start");
    await jeune.appuie("pays:TG:");
    await jeune.appuie("cons:TG:");
    nouveauxMessages();
    await jeune.appuie("min");
    expect(env.textes(nouveauxMessages())).toEqual([fr.mineur]);
    expect(await prisma.user.count()).toBe(0);
  });

  it("permet de corriger les compétences et reprend au même endroit après /start", async () => {
    const { jeune, nouveauxMessages } = env;
    await consentir(env);
    await jeune.ecrit(REPONSES_TEXTE[0]!);
    nouveauxMessages();
    await jeune.ecrit("/start");
    expect(env.textes(nouveauxMessages())).toEqual([fr.reprise, fr.questions.duree]);
    for (const reponse of REPONSES_TEXTE.slice(1)) await jeune.ecrit(reponse);
    await jeune.appuie("etudes:aucun");
    await jeune.appuie("objectif:FORMATION");
    await jeune.appuie("cv:non");
    await jeune.appuie("comp:corr");
    await jeune.ecrit("Ajoute aussi la coiffure, je tresse le week-end.");
    const messages = nouveauxMessages();
    expect(String(messages.at(-1)?.text)).toContain("- Coiffure");
  });

  it("ignore une mise à jour reçue deux fois (idempotence)", async () => {
    const { jeune, prisma, appels } = env;
    const update = {
      update_id: 9999,
      message: {
        message_id: 1,
        date: 0,
        chat: { id: 424242, type: "private" },
        from: { id: 424242, is_bot: false, first_name: "Afi" },
        text: "/start",
      },
    };
    await jeune.rejoue(update);
    const apresPremier = appels.length;
    await jeune.rejoue(update);
    expect(appels.length).toBe(apresPremier);
    expect(await prisma.processedUpdate.count({ where: { updateId: 9999n } })).toBe(1);
  });
});

describe("suivi du plan", () => {
  it("envoie les rappels J+3, J+7 et J+30 une seule fois, avec une horloge simulée", async () => {
    await allerJusquauPlan(env);
    const { horloge, deps, planificateur, nouveauxMessages, textes } = env;
    nouveauxMessages();
    // Rappels triés par date : J+3, J+7, J+30.
    const tries = [...planificateur.rappels].sort(
      (a, b) => a.prevuLe.getTime() - b.prevuLe.getTime(),
    );
    expect(tries).toHaveLength(3);

    horloge.avancerJours(2);
    expect(await executerRappel(deps, tries[0]!.id)).toBe(false);
    horloge.avancerJours(1);
    expect(await executerRappel(deps, tries[0]!.id)).toBe(true);
    const messages = nouveauxMessages();
    expect(messages[0]?.text).toBe(fr.rappel(3));
    expect(messages.slice(1)).toHaveLength(3);
    expect(await executerRappel(deps, tries[0]!.id)).toBe(false);

    horloge.avancerJours(4);
    expect(await executerRappel(deps, tries[1]!.id)).toBe(true);
    expect(textes(nouveauxMessages())[0]).toBe(fr.rappel(7));
    horloge.avancerJours(23);
    expect(await executerRappel(deps, tries[2]!.id)).toBe(true);
    expect(textes(nouveauxMessages())[0]).toBe(fr.rappel(30));
  });

  it("enregistre Fait, et demande une raison pour Bloqué", async () => {
    await allerJusquauPlan(env);
    const { jeune, prisma, nouveauxMessages } = env;
    const [e1, e2] = await prisma.planEtape.findMany({ orderBy: { ordre: "asc" } });
    nouveauxMessages();
    await jeune.appuie(`et:${e1!.id}:F`);
    await jeune.appuie(`et:${e2!.id}:B`);
    expect(env.textes(nouveauxMessages())).toEqual([fr.statutEnregistre, fr.raisonBlocage]);
    await jeune.ecrit("Je n'ai pas l'argent du transport.");
    expect(env.textes(nouveauxMessages())).toEqual([fr.statutBloqueEnregistre]);
    const etapes = await prisma.planEtape.findMany({ orderBy: { ordre: "asc" } });
    expect(etapes.map((e) => e.statut)).toEqual(["FAIT", "BLOQUE", "A_FAIRE"]);
    expect(etapes[1]?.raison).toBe("Je n'ai pas l'argent du transport.");
  });

  it("/monplan envoie un lien magique et /plan réaffiche le plan", async () => {
    await allerJusquauPlan(env);
    const { jeune, nouveauxMessages, boutons } = env;
    nouveauxMessages();
    await jeune.ecrit("/monplan");
    const lien = boutons(nouveauxMessages()[0])[0]?.url ?? "";
    expect(lien).toMatch(/^https:\/\/sentya\.test\/monplan\/[\w-]{40,}$/);
    await jeune.ecrit("/plan");
    const messages = nouveauxMessages();
    expect(messages[0]?.text).toBe(fr.introPlan);
    expect(boutons(messages.at(-1)).map((b) => b.text)).toEqual(["Recevoir en PDF"]);
  });

  it("/supprimer efface réellement toutes les données, après deux confirmations", async () => {
    await allerJusquauPlan(env);
    const { jeune, prisma, nouveauxMessages } = env;
    nouveauxMessages();
    await jeune.ecrit("/supprimer");
    await jeune.appuie("sup:1");
    expect(await prisma.user.count()).toBe(1);
    await jeune.appuie("sup:2");
    expect(env.textes(nouveauxMessages()).at(-1)).toBe(fr.supprimerFait);
    for (const n of [
      await prisma.user.count(),
      await prisma.conversationState.count(),
      await prisma.bilanReponse.count(),
      await prisma.userCompetence.count(),
      await prisma.piste.count(),
      await prisma.plan.count(),
      await prisma.planEtape.count(),
      await prisma.rappel.count(),
    ]) {
      expect(n).toBe(0);
    }
  });
});

describe("indisponibilité de Gemini", () => {
  it("prévient le jeune, programme un nouvel essai, puis reprend là où il en était", async () => {
    let enPanne = false;
    env = creerEnvironnement((requete, n) => {
      if (enPanne) throw new IAIndisponibleError("panne simulée");
      return repondeurParcours(requete, n);
    });
    const { jeune, prisma, planificateur, nouveauxMessages, deps } = env;
    await consentir(env);
    for (const reponse of REPONSES_TEXTE) await jeune.ecrit(reponse);
    await jeune.appuie("etudes:aucun");
    await jeune.appuie("objectif:EMPLOI");
    nouveauxMessages();

    enPanne = true;
    await jeune.appuie("cv:non");
    expect(env.textes(nouveauxMessages())).toEqual([fr.iaIndisponible]);
    expect(planificateur.reprises).toEqual([
      expect.objectContaining({ tentative: 1, delaiSecondes: 120 }),
    ]);

    enPanne = false;
    const user = await prisma.user.findFirstOrThrow();
    expect(await reprendreMessageEnAttente(deps, user.id)).toBe(true);
    expect(String(nouveauxMessages().at(-1)?.text)).toContain("C'est juste ?");
    expect(await reprendreMessageEnAttente(deps, user.id)).toBe(false);
  });
});

describe("opportunités vérifiées dans le plan", () => {
  it("affiche l'offre, envoie le profil avec accord, la signale, puis la retire après 3 signalements", async () => {
    const { jeune, prisma, nouveauxMessages, boutons, ctx } = env;
    await consentir(env);
    for (const reponse of REPONSES_TEXTE) await jeune.ecrit(reponse);
    await jeune.appuie("etudes:aucun");
    await jeune.appuie("objectif:EMPLOI");
    await jeune.appuie("cv:non");
    await jeune.appuie("comp:ok");
    const offre = await creerOpportuniteVerifiee(prisma, { metierId: "bj-couture" });
    const piste = await prisma.piste.findFirstOrThrow({ where: { metierId: "bj-couture" } });
    nouveauxMessages();

    // EF-09 : l'offre vérifiée apparaît avec sa date, "Signaler" et l'envoi du profil.
    await jeune.appuie(`choisir:${piste.rang}`);
    let messages = nouveauxMessages();
    const messageOffre = messages.find((m) => String(m.text).includes("Apprenti couturier"));
    expect(String(messageOffre?.text)).toContain("Vérifiée le 01/11/2026");
    expect(String(messageOffre?.text)).toContain(fr.conseilAntiArnaque);
    expect(boutons(messageOffre).map((b) => b.callback_data)).toEqual([
      `sig:${offre.id}`,
      `cand:${offre.id}`,
    ]);

    // RG-07 : rien n'est partagé avant l'accord explicite pour cette offre.
    await jeune.appuie(`cand:${offre.id}`);
    expect(String(nouveauxMessages()[0]?.text)).toContain("Atelier Exemple");
    expect(await prisma.candidature.count()).toBe(0);
    await jeune.appuie(`candok:${offre.id}`);
    expect(env.textes(nouveauxMessages())).toEqual([fr.candidatureEnvoyee]);
    expect((await prisma.candidature.findFirstOrThrow()).consentAt).toEqual(
      ctx.horloge.maintenant(),
    );

    // EF-10 : signalement depuis le bot, avec un motif.
    await jeune.appuie(`sig:${offre.id}`);
    expect(env.textes(nouveauxMessages())).toEqual([fr.demandeMotifSignalement]);
    await jeune.ecrit("Ils demandent de l'argent pour l'entretien.");
    expect(env.textes(nouveauxMessages())).toEqual([fr.signalementMerci]);

    // RG-06 : au 3e signalement, l'offre disparaît aussi du plan déjà créé.
    for (const id of ["9001", "9002"]) {
      const autre = await creerJeune(ctx, id);
      await signalerOpportunite(ctx, {
        opportuniteId: offre.id,
        userId: autre.id,
        motif: "Arnaque",
      });
    }
    expect((await prisma.opportunite.findUniqueOrThrow({ where: { id: offre.id } })).statut).toBe(
      "SUSPENDUE",
    );
    await jeune.ecrit("/plan");
    messages = nouveauxMessages();
    expect(messages.some((m) => String(m.text).includes("Apprenti couturier"))).toBe(false);
  });
});

describe("sans fournisseur audio (pas de clé Gemini)", () => {
  it("demande d'écrire au lieu de transcrire un vocal, et retire l'option audio", async () => {
    const { jeune, ia, appels, nouveauxMessages } = env;
    (ia as unknown as { audioDisponible: boolean }).audioDisponible = false;
    await consentir(env);
    nouveauxMessages();

    await jeune.parle();
    // Le bot explique, puis repose la question en cours.
    expect(env.textes(nouveauxMessages())).toEqual([fr.vocalNonDisponible, fr.questions.activites]);
    expect(ia.appelsPour("transcription")).toHaveLength(0);
    expect(appels.some((a) => a.methode === "getFile")).toBe(false);

    // Le jeune peut continuer par écrit, à la même question.
    await jeune.ecrit(REPONSES_TEXTE[0]!);
    expect(env.textes(nouveauxMessages())).toEqual([fr.questions.duree]);

    await jeune.ecrit("/parametres");
    expect(env.textes(nouveauxMessages())).toEqual([fr.audioIndisponible]);
  });
});

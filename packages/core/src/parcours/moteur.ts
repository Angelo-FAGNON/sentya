// Moteur de parcours, indépendant du canal : Raconter, Choisir, Avancer.
// Chaque message entrant est traité selon l'étape persistée en base (reprise après coupure).
// Avant consentement, rien n'est écrit : l'état voyage dans les boutons (RG-01, H4).
import type { Prisma, User } from "@sentya/db";
import type { FichierEntrant, MessageEntrant } from "../canal/canal";
import { EVENEMENTS, enregistrerEvenement } from "../analytique/evenements";
import { filtrerDonneesSensibles } from "../confidentialite/donnees-sensibles";
import { formaterDate } from "../dates";
import { appelerAvecSchema } from "../ia/appel-structure";
import { IAIndisponibleError } from "../ia/fournisseur";
import { schemaTranscription } from "../ia/schemas";
import { fr, VOIE_LIBELLE } from "../messages/fr";
import {
  enregistrerReponse,
  questionSuivante,
  QUESTIONS_BILAN,
  reponsesDuBilan,
  texteDepuisAction,
  trouverQuestion,
  type QuestionBilan,
} from "../orientation/bilan";
import {
  appliquerCorrection,
  enregistrerCompetences,
  extraireCompetences,
  fusionnerCompetences,
  interpreterCorrection,
  libellesCompetences,
} from "../orientation/competences";
import { construireFiche, formaterFiche } from "../orientation/fiche";
import {
  AucunMetierError,
  genererPistes,
  pistesDuDernierLot,
  type PisteAffichable,
} from "../orientation/pistes";
import {
  changerStatutEtape,
  creerPlan,
  formaterPlan,
  planActif,
  PlanIndisponibleError,
} from "../orientation/plan";
import { construireEntreeTranscription, PROMPT_TRANSCRIPTION } from "../prompts/transcription.v1";
import { CandidatureImpossibleError, postuler } from "../regles/candidature";
import { creerProfil, trouverProfil } from "../regles/consentement";
import { signalerOpportunite } from "../regles/fraude";
import { creerLienMagique } from "../regles/lien-magique";
import { mentionSource } from "../regles/sources";
import { supprimerUtilisateur } from "../regles/suppression";
import { ACTIONS, lireAction, sourceCourte } from "./actions";
import { Envoi, envoyerAudio } from "./envoi";
import type {
  DependancesParcours,
  DonneesEtat,
  EntreeParcours,
  Etape,
  EtatConversation,
} from "./types";

/** Taille maximale d'un fichier reçu (CV, vocal). */
export const FICHIER_OCTETS_MAX = 10 * 1024 * 1024;
/** Durée maximale d'un vocal. */
export const VOCAL_SECONDES_MAX = 180;
/** Délai de validité d'une confirmation (/supprimer, /recommencer). */
const CONFIRMATION_MS = 10 * 60 * 1000;
/** Délais des nouvelles tentatives quand l'IA est indisponible (secondes). */
export const DELAIS_REPRISE = [120, 300, 600];

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

export async function traiterMessage(
  deps: DependancesParcours,
  entree: EntreeParcours,
): Promise<void> {
  const { ctx, canal } = deps;
  const envoi = new Envoi(canal, entree.idCanal);
  const user = await trouverProfil(ctx, canal.nom, entree.idCanal);

  if (!user) {
    await traiterAvantConsentement(deps, envoi, entree);
    return;
  }

  await ctx.prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: ctx.horloge.maintenant() },
  });
  const etat = await chargerEtat(deps, user.id);

  try {
    await traiterApresConsentement(deps, envoi, user, etat, entree);
  } catch (erreur) {
    if (!(erreur instanceof IAIndisponibleError)) throw erreur;
    await mettreEnAttente(deps, envoi, user, entree);
  }

  // EF-14 : réponse audio en plus du texte. Le compte peut avoir été supprimé entre-temps.
  if (
    user.audioReplies &&
    ctx.ia.audioDisponible !== false &&
    deps.convertirVoix &&
    envoi.textes.length > 0
  ) {
    const encore = await ctx.prisma.user.findUnique({
      where: { id: user.id },
      select: { audioReplies: true },
    });
    if (encore?.audioReplies) {
      await envoyerAudio({
        ia: ctx.ia,
        canal,
        destinataire: entree.idCanal,
        textes: envoi.textes,
        convertirVoix: deps.convertirVoix,
        journal: ctx.journal,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Avant consentement : aucune écriture en base (RG-01, RG-02)
// ---------------------------------------------------------------------------

async function traiterAvantConsentement(
  deps: DependancesParcours,
  envoi: Envoi,
  entree: EntreeParcours,
) {
  const { message } = entree;

  if (message.type === "commande" && message.commande === "start") {
    const source = sourceCourte(message.argument);
    const [m1 = "", m2 = "", m3 = ""] = fr.accueil;
    await envoi.texte(m1);
    await envoi.texte(m2);
    await envoi.texte(m3, {
      boutons: [
        { libelle: fr.boutons.benin, action: ACTIONS.pays("BJ", source) },
        { libelle: fr.boutons.togo, action: ACTIONS.pays("TG", source) },
      ],
    });
    return;
  }

  if (message.type === "commande" && message.commande === "supprimer") {
    await envoi.texte(fr.aucuneDonnee);
    return;
  }

  if (message.type === "action") {
    const { prefixe, args } = lireAction(message.action);
    const pays = args[0] === "BJ" || args[0] === "TG" ? args[0] : null;
    const source = args[1] ?? "";

    if (prefixe === "pays" && pays) {
      await envoi.texte(fr.consentement(deps.urlConfidentialite), {
        boutons: [
          { libelle: fr.boutons.accepte, action: ACTIONS.consentement(pays, source) },
          { libelle: fr.boutons.plusTard, action: ACTIONS.plusTard },
        ],
      });
      return;
    }
    if (prefixe === "cons" && pays) {
      await envoi.texte(fr.questionAge, {
        boutons: [
          { libelle: fr.boutons.majeur, action: ACTIONS.majeur(pays, source) },
          { libelle: fr.boutons.mineur, action: ACTIONS.mineur },
        ],
      });
      return;
    }
    if (message.action === ACTIONS.plusTard) {
      await envoi.texte(fr.plusTard);
      return;
    }
    if (message.action === ACTIONS.mineur) {
      await envoi.texte(fr.mineur);
      return;
    }
    if (prefixe === "maj" && pays) {
      // Consentement ET âge confirmés : création du profil, première écriture en base.
      const { user } = await creerProfil(deps.ctx, {
        canal: deps.canal.nom,
        idCanal: entree.idCanal,
        pays,
        consentement: true,
        majeur: true,
        sourceAcquisition: source || null,
        prenom: entree.prenomCanal,
      });
      await demarrerBilan(deps, envoi, user);
      return;
    }
  }

  await envoi.texte(fr.commencerParStart);
}

// ---------------------------------------------------------------------------
// Après consentement
// ---------------------------------------------------------------------------

async function traiterApresConsentement(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const { message } = entree;

  if (message.type === "commande") {
    await traiterCommande(deps, envoi, user, etat, message.commande);
    return;
  }

  if (message.type === "action") {
    const traitee = await traiterActionGlobale(deps, envoi, user, etat, message.action);
    if (traitee) return;
  }

  // Un CV peut être envoyé pendant le bilan, à l'étape CV ou pendant la validation.
  if (
    (message.type === "document" || message.type === "photo") &&
    ["BILAN", "CV", "VALIDATION", "COMPLEMENT"].includes(etat.etape)
  ) {
    await traiterCv(deps, envoi, user, etat, message.fichier, entree.derniereTentative);
    return;
  }

  switch (etat.etape) {
    case "BILAN":
      await etapeBilan(deps, envoi, user, etat, entree);
      return;
    case "CV":
      if (message.type === "action" && message.action === ACTIONS.continuerSansCv) {
        await lancerExtraction(deps, envoi, user, etat, entree.derniereTentative);
      } else if (message.type === "texte" || message.type === "vocal") {
        await lancerExtraction(deps, envoi, user, etat, entree.derniereTentative);
      } else {
        await relancer(deps, envoi, user, etat);
      }
      return;
    case "COMPLEMENT":
      await etapeComplement(deps, envoi, user, etat, entree);
      return;
    case "VALIDATION":
      await etapeValidation(deps, envoi, user, etat, entree);
      return;
    case "CORRECTION":
      await etapeCorrection(deps, envoi, user, etat, entree);
      return;
    case "RAISON":
      await etapeRaison(deps, envoi, user, etat, entree);
      return;
    case "SIGNALEMENT":
      await etapeSignalement(deps, envoi, user, etat, entree);
      return;
    case "PISTES":
    case "FICHE":
    case "PLAN":
      await envoi.texte(fr.nonCompris);
      return;
  }
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------

async function traiterCommande(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  commande: string,
) {
  const { ctx } = deps;
  switch (commande) {
    case "start":
      await envoi.texte(fr.reprise);
      await relancer(deps, envoi, user, etat);
      return;
    case "plan": {
      const plan = await planActif(ctx.prisma, user.id);
      if (!plan) {
        await envoi.texte(fr.aucunPlan);
        await relancer(deps, envoi, user, etat);
        return;
      }
      await envoyerPlan(deps, envoi, plan.id, { pdf: false });
      return;
    }
    case "changer": {
      const pistes = await pistesDuDernierLot(ctx.prisma, user.id);
      if (pistes.length === 0) {
        await envoi.texte(fr.aucunPlan);
        await relancer(deps, envoi, user, etat);
        return;
      }
      await sauverEtat(deps, user.id, { etape: "PISTES", donnees: {} });
      await envoi.texte(fr.changerPiste);
      await afficherPistes(envoi, pistes);
      return;
    }
    case "recommencer":
      await sauverEtat(deps, user.id, {
        etape: etat.etape,
        donnees: { ...etat.donnees, recommencerDemandeLe: ctx.horloge.maintenant().toISOString() },
      });
      await envoi.texte(fr.confirmerRecommencer, {
        boutons: [
          { libelle: fr.boutons.ouiRecommencer, action: ACTIONS.recommencerOui },
          { libelle: fr.boutons.annuler, action: ACTIONS.recommencerNon },
        ],
      });
      return;
    case "monplan": {
      const plan = await planActif(ctx.prisma, user.id);
      if (!plan) {
        await envoi.texte(fr.aucunPlan);
        await relancer(deps, envoi, user, etat);
        return;
      }
      const url = await creerLienMagique(ctx, user.id);
      await envoi.texte(fr.lienPlan, { lien: { libelle: fr.boutons.ouvrirPlan, url } });
      return;
    }
    case "parametres":
      if (ctx.ia.audioDisponible === false) {
        await envoi.texte(fr.audioIndisponible);
        return;
      }
      await envoi.texte(fr.parametres(user.audioReplies), {
        boutons: [
          user.audioReplies
            ? { libelle: fr.boutons.desactiverAudio, action: ACTIONS.audio(false) }
            : { libelle: fr.boutons.activerAudio, action: ACTIONS.audio(true) },
        ],
      });
      return;
    case "supprimer":
      await sauverEtat(deps, user.id, {
        etape: etat.etape,
        donnees: { ...etat.donnees, suppressionDemandeeLe: ctx.horloge.maintenant().toISOString() },
      });
      await envoi.texte(fr.supprimerEtape1, {
        boutons: [
          { libelle: fr.boutons.ouiEffacer, action: ACTIONS.supprimer1 },
          { libelle: fr.boutons.annuler, action: ACTIONS.supprimerNon },
        ],
      });
      return;
    default:
      await envoi.texte(fr.nonCompris);
  }
}

/** Une confirmation n'est valable que 10 minutes après la demande. */
function confirmationValide(horodatage: string | undefined, maintenant: Date): boolean {
  if (!horodatage) return false;
  const ecart = maintenant.getTime() - new Date(horodatage).getTime();
  return ecart >= 0 && ecart <= CONFIRMATION_MS;
}

// ---------------------------------------------------------------------------
// Actions valables à toute étape
// ---------------------------------------------------------------------------

async function traiterActionGlobale(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  action: string,
): Promise<boolean> {
  const { ctx } = deps;
  const maintenant = ctx.horloge.maintenant();
  const { prefixe, args } = lireAction(action);

  switch (prefixe) {
    case "sup": {
      if (args[0] === "non") {
        await sauverEtat(deps, user.id, {
          etape: etat.etape,
          donnees: { ...etat.donnees, suppressionDemandeeLe: undefined },
        });
        await envoi.texte(fr.supprimerAnnule);
      } else if (!confirmationValide(etat.donnees.suppressionDemandeeLe, maintenant)) {
        await envoi.texte(fr.nonCompris);
      } else if (args[0] === "1") {
        await envoi.texte(fr.supprimerEtape2, {
          boutons: [
            { libelle: fr.boutons.jeConfirme, action: ACTIONS.supprimer2 },
            { libelle: fr.boutons.annuler, action: ACTIONS.supprimerNon },
          ],
        });
      } else if (args[0] === "2") {
        await supprimerUtilisateur(ctx.prisma, user.id, maintenant);
        await envoi.texte(fr.supprimerFait);
      }
      return true;
    }
    case "rec": {
      if (args[0] === "oui" && confirmationValide(etat.donnees.recommencerDemandeLe, maintenant)) {
        await recommencer(deps, envoi, user);
      } else {
        await sauverEtat(deps, user.id, {
          etape: etat.etape,
          donnees: { ...etat.donnees, recommencerDemandeLe: undefined },
        });
        await envoi.texte(fr.recommencerAnnule);
      }
      return true;
    }
    case "audio": {
      const actif = args[0] === "on";
      if (actif && ctx.ia.audioDisponible === false) {
        await envoi.texte(fr.audioIndisponible);
        return true;
      }
      await ctx.prisma.user.update({ where: { id: user.id }, data: { audioReplies: actif } });
      user.audioReplies = actif;
      await envoi.texte(actif ? fr.audioActive : fr.audioDesactive);
      return true;
    }
    case "voir": {
      await afficherFiche(deps, envoi, user, Number(args[0]));
      return true;
    }
    case "pistes": {
      const pistes = await pistesDuDernierLot(ctx.prisma, user.id);
      if (pistes.length > 0) {
        await sauverEtat(deps, user.id, { etape: "PISTES", donnees: {} });
        await afficherPistes(envoi, pistes);
      }
      return true;
    }
    case "choisir": {
      await choisirPiste(deps, envoi, user, Number(args[0]));
      return true;
    }
    case "et": {
      await demanderStatutEtape(deps, envoi, user, etat, args[0] ?? "", args[1] ?? "");
      return true;
    }
    case "sig": {
      await sauverEtat(deps, user.id, {
        etape: "SIGNALEMENT",
        donnees: { opportuniteId: args[0], retour: etapeDeRetour(etat) },
      });
      await envoi.texte(fr.demandeMotifSignalement);
      return true;
    }
    case "cand": {
      const opportunite = await ctx.prisma.opportunite.findUnique({
        where: { id: args[0] ?? "" },
        include: { partenaire: true },
      });
      if (
        !opportunite ||
        opportunite.statut !== "VERIFIEE" ||
        opportunite.partenaire?.statutValidation !== "VALIDE"
      ) {
        await envoi.texte(fr.candidatureImpossible);
        return true;
      }
      await envoi.texte(fr.consentementCandidature(opportunite.partenaire.nom), {
        boutons: [
          { libelle: fr.boutons.ouiEnvoie, action: ACTIONS.candidatureOui(opportunite.id) },
          { libelle: fr.boutons.non, action: ACTIONS.candidatureNon },
        ],
      });
      return true;
    }
    case "candok": {
      try {
        await postuler(ctx, {
          userId: user.id,
          opportuniteId: args[0] ?? "",
          accordExplicite: true,
        });
        await envoi.texte(fr.candidatureEnvoyee);
      } catch (erreur) {
        if (!(erreur instanceof CandidatureImpossibleError)) throw erreur;
        await envoi.texte(fr.candidatureImpossible);
      }
      return true;
    }
    case "candno":
      await envoi.texte(fr.candidatureAnnulee);
      return true;
    case "pdf": {
      const plan = await planActif(ctx.prisma, user.id);
      if (plan && deps.genererPdfPlan) {
        await envoi.document(
          await deps.genererPdfPlan(plan.id),
          "plan-sentya.pdf",
          fr.planPdfLegende,
        );
      } else if (!plan) {
        await envoi.texte(fr.aucunPlan);
      }
      return true;
    }
    default:
      return false;
  }
}

/** Étape à retrouver après une parenthèse (raison, signalement). */
function etapeDeRetour(etat: EtatConversation): Etape {
  return etat.etape === "RAISON" || etat.etape === "SIGNALEMENT"
    ? (etat.donnees.retour ?? "PLAN")
    : etat.etape;
}

// ---------------------------------------------------------------------------
// Bilan (EF-02)
// ---------------------------------------------------------------------------

async function demarrerBilan(deps: DependancesParcours, envoi: Envoi, user: User) {
  const premiere = QUESTIONS_BILAN[0];
  if (!premiere) return;
  await sauverEtat(deps, user.id, { etape: "BILAN", donnees: { question: premiere.cle } });
  await enregistrerEvenement(deps.ctx.prisma, {
    type: EVENEMENTS.BILAN_COMMENCE,
    userHash: user.userHash,
    canal: user.canal,
    date: deps.ctx.horloge.maintenant(),
  });
  await envoi.texte(fr.debutBilan);
  await poserQuestion(envoi, premiere);
}

async function poserQuestion(envoi: Envoi, question: QuestionBilan) {
  await envoi.texte(
    question.texte,
    question.boutons.length > 0 ? { boutons: question.boutons } : undefined,
  );
}

/** Transforme un message (texte, vocal ou bouton) en texte de réponse. */
async function lireReponse(
  deps: DependancesParcours,
  envoi: Envoi,
  message: MessageEntrant,
  question: string,
  derniereTentative?: boolean,
): Promise<{ texte: string; source: "TEXTE" | "VOCAL" } | null> {
  if (message.type === "texte") return { texte: message.texte, source: "TEXTE" };
  if (message.type === "action") {
    const texte = texteDepuisAction(message.action);
    return texte ? { texte, source: "TEXTE" } : null;
  }
  if (message.type === "vocal") {
    const texte = await transcrire(deps, envoi, message.fichier, question, derniereTentative);
    return texte === null ? null : { texte, source: "VOCAL" };
  }
  return null;
}

async function etapeBilan(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const question = trouverQuestion(etat.donnees.question ?? "") ?? QUESTIONS_BILAN[0];
  if (!question) return;
  const { message } = entree;

  // Un bouton ne vaut que pour la question en cours.
  if (message.type === "action" && !question.boutons.some((b) => b.action === message.action)) {
    await envoi.texte(fr.nonCompris);
    return;
  }
  const reponse = await lireReponse(deps, envoi, message, question.texte, entree.derniereTentative);
  if (!reponse) {
    if (message.type !== "vocal") await envoi.texte(fr.nonCompris);
    await poserQuestion(envoi, question);
    return;
  }

  const resultat = await enregistrerReponse(deps.ctx, {
    userId: user.id,
    userHash: user.userHash,
    question,
    texte: reponse.texte,
    sourceType: reponse.source,
  });
  if (resultat.statut === "VIDE_APRES_FILTRE") {
    await envoi.texte(fr.donneesSensiblesRetirees);
    await poserQuestion(envoi, question);
    return;
  }
  if (resultat.statut === "TROP_COURTE") {
    await envoi.texte(fr.reponseTropCourte);
    return;
  }
  if (resultat.donneesRetirees) await envoi.texte(fr.donneesSensiblesRetirees);

  const suivante = questionSuivante(question.cle);
  if (suivante) {
    await sauverEtat(deps, user.id, {
      etape: "BILAN",
      donnees: { ...etat.donnees, question: suivante.cle },
    });
    await poserQuestion(envoi, suivante);
    return;
  }
  await sauverEtat(deps, user.id, {
    etape: "CV",
    donnees: { cvCompetences: etat.donnees.cvCompetences },
  });
  await envoi.texte(fr.proposerCv, {
    boutons: [{ libelle: fr.boutons.continuerSansCv, action: ACTIONS.continuerSansCv }],
  });
}

async function etapeComplement(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const question = trouverQuestion("activites");
  if (!question) return;
  const reponse = await lireReponse(
    deps,
    envoi,
    entree.message,
    question.texte,
    entree.derniereTentative,
  );
  if (!reponse) {
    if (entree.message.type !== "vocal") await envoi.texte(fr.aucuneCompetence);
    return;
  }
  const resultat = await enregistrerReponse(deps.ctx, {
    userId: user.id,
    userHash: user.userHash,
    question,
    texte: reponse.texte,
    sourceType: reponse.source,
  });
  if (resultat.statut !== "ENREGISTREE") {
    await envoi.texte(
      resultat.statut === "VIDE_APRES_FILTRE" ? fr.donneesSensiblesRetirees : fr.reponseTropCourte,
    );
    return;
  }
  await lancerExtraction(deps, envoi, user, etat, entree.derniereTentative);
}

// ---------------------------------------------------------------------------
// Compétences : extraction, CV, validation, correction (EF-03, EF-04)
// ---------------------------------------------------------------------------

async function lancerExtraction(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  derniereTentative?: boolean,
) {
  const { ctx } = deps;
  await envoi.activite();
  const reponses = await reponsesDuBilan(ctx, user.id);
  const resultat = await extraireCompetences(ctx, {
    reponses,
    nomsConnus: [user.prenom],
    repliSiIndisponible: derniereTentative,
  });
  const competences = fusionnerCompetences(
    resultat.competenceIds,
    etat.donnees.cvCompetences ?? [],
  );

  if (competences.length === 0) {
    await sauverEtat(deps, user.id, {
      etape: "COMPLEMENT",
      donnees: { cvCompetences: etat.donnees.cvCompetences },
    });
    await envoi.texte(fr.aucuneCompetence);
    return;
  }
  await sauverEtat(deps, user.id, {
    etape: "VALIDATION",
    donnees: {
      competences,
      activites: resultat.activites,
      cvCompetences: etat.donnees.cvCompetences,
    },
  });
  await enregistrerEvenement(ctx.prisma, {
    type: EVENEMENTS.BILAN_TERMINE,
    userHash: user.userHash,
    canal: user.canal,
    payload: { origine: resultat.origine, nbCompetences: competences.length },
    date: ctx.horloge.maintenant(),
  });
  await afficherRecap(deps, envoi, competences);
}

async function afficherRecap(deps: DependancesParcours, envoi: Envoi, competences: string[]) {
  const libelles = await libellesCompetences(deps.ctx.prisma, competences);
  await envoi.texte(fr.recapCompetences(libelles), {
    boutons: [
      { libelle: fr.boutons.oui, action: ACTIONS.competencesOk },
      { libelle: fr.boutons.corriger, action: ACTIONS.competencesCorriger },
    ],
  });
}

/** EF-04 : lit le CV en mémoire, extrait les compétences, puis oublie le fichier. */
async function traiterCv(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  fichier: FichierEntrant,
  derniereTentative?: boolean,
) {
  const { ctx } = deps;
  const typeAccepte =
    fichier.mimeType === "application/pdf" || fichier.mimeType.startsWith("image/");
  if (!typeAccepte) {
    await envoi.texte(fr.cvIllisible);
    return;
  }
  if ((fichier.tailleOctets ?? 0) > FICHIER_OCTETS_MAX) {
    await envoi.texte(fr.fichierTropLourd);
    return;
  }
  await envoi.activite();
  // Le fichier reste en mémoire le temps de l'extraction : jamais écrit sur disque ni en base.
  const { donnees } = await deps.canal.telechargerFichier(fichier);
  const resultat = await extraireCompetences(ctx, {
    reponses: [],
    cv: { mimeType: fichier.mimeType, donnees },
    repliSiIndisponible: derniereTentative,
  });
  if (resultat.competenceIds.length === 0) {
    await envoi.texte(fr.cvIllisible);
    await relancer(deps, envoi, user, etat);
    return;
  }
  await enregistrerEvenement(ctx.prisma, {
    type: EVENEMENTS.CV_IMPORTE,
    userHash: user.userHash,
    date: ctx.horloge.maintenant(),
  });
  await envoi.texte(fr.cvLu);

  const cvCompetences = fusionnerCompetences(
    etat.donnees.cvCompetences ?? [],
    resultat.competenceIds,
  );
  if (etat.etape === "VALIDATION") {
    const competences = fusionnerCompetences(
      etat.donnees.competences ?? [],
      resultat.competenceIds,
    );
    await sauverEtat(deps, user.id, {
      etape: "VALIDATION",
      donnees: { ...etat.donnees, competences, cvCompetences },
    });
    await afficherRecap(deps, envoi, competences);
    return;
  }
  const nouvelEtat: EtatConversation = {
    etape: etat.etape,
    donnees: { ...etat.donnees, cvCompetences },
  };
  await sauverEtat(deps, user.id, nouvelEtat);
  if (etat.etape === "CV" || etat.etape === "COMPLEMENT") {
    await lancerExtraction(deps, envoi, user, nouvelEtat, derniereTentative);
  } else {
    await relancer(deps, envoi, user, nouvelEtat);
  }
}

async function etapeValidation(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const { message } = entree;
  if (message.type === "action" && message.action === ACTIONS.competencesOk) {
    const competences = etat.donnees.competences ?? [];
    const issuesDuCv = new Set(etat.donnees.cvCompetences ?? []);
    await enregistrerCompetences(
      deps.ctx.prisma,
      user.id,
      competences.map((id) => ({ id, origine: issuesDuCv.has(id) ? "CV" : "BILAN" })),
      true,
    );
    await enregistrerEvenement(deps.ctx.prisma, {
      type: EVENEMENTS.COMPETENCES_VALIDEES,
      userHash: user.userHash,
      date: deps.ctx.horloge.maintenant(),
    });
    await genererEtAfficherPistes(deps, envoi, user, etat, entree.derniereTentative);
    return;
  }
  if (message.type === "action" && message.action === ACTIONS.competencesCorriger) {
    await sauverEtat(deps, user.id, { etape: "CORRECTION", donnees: etat.donnees });
    await envoi.texte(fr.demandeCorrection);
    return;
  }
  if (message.type === "texte" || message.type === "vocal") {
    await etapeCorrection(deps, envoi, user, etat, entree);
    return;
  }
  await afficherRecap(deps, envoi, etat.donnees.competences ?? []);
}

async function etapeCorrection(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const reponse = await lireReponse(
    deps,
    envoi,
    entree.message,
    fr.demandeCorrection,
    entree.derniereTentative,
  );
  if (!reponse) {
    if (entree.message.type !== "vocal") await envoi.texte(fr.demandeCorrection);
    return;
  }
  const demande = filtrerDonneesSensibles(reponse.texte).texte;
  const actuelles = etat.donnees.competences ?? [];
  const correction = await interpreterCorrection(deps.ctx, {
    demande,
    actuelles,
    nomsConnus: [user.prenom],
    repliSiIndisponible: entree.derniereTentative,
  });
  const competences = appliquerCorrection(actuelles, correction);
  await sauverEtat(deps, user.id, {
    etape: "VALIDATION",
    donnees: { ...etat.donnees, competences },
  });
  await envoi.texte(fr.correctionAppliquee);
  await afficherRecap(deps, envoi, competences);
}

// ---------------------------------------------------------------------------
// Pistes et fiche (EF-05, EF-06)
// ---------------------------------------------------------------------------

async function genererEtAfficherPistes(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  derniereTentative?: boolean,
) {
  const { ctx } = deps;
  await envoi.texte(fr.jeReflechis);
  await envoi.activite();
  const competences = await ctx.prisma.userCompetence.findMany({
    where: { userId: user.id, validee: true },
    select: { competenceId: true },
  });
  const profil = await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  try {
    const pistes = await genererPistes(
      ctx,
      {
        userId: user.id,
        userHash: user.userHash,
        pays: profil.pays,
        objectif: profil.objectif,
        niveauEtudes: profil.niveauEtudes,
        competenceIds: competences.map((c) => c.competenceId),
        activites: etat.donnees.activites ?? [],
      },
      { repliSiIndisponible: derniereTentative },
    );
    await sauverEtat(deps, user.id, { etape: "PISTES", donnees: {} });
    await afficherPistes(envoi, pistes);
  } catch (erreur) {
    if (!(erreur instanceof AucunMetierError)) throw erreur;
    await envoi.texte(fr.planIndisponible);
  }
}

async function afficherPistes(envoi: Envoi, pistes: PisteAffichable[]) {
  await envoi.texte(fr.introPistes);
  for (const p of pistes) {
    await envoi.texte(
      fr.piste({
        rang: p.rang,
        libelle: p.libelle,
        voie: VOIE_LIBELLE[p.voie],
        raison: p.raison,
        condition: p.conditionPrincipale,
        source: mentionSource(p),
        aExplorer: p.aExplorer,
      }),
    );
  }
  await envoi.texte(fr.choisirUnePiste, {
    boutons: pistes.map((p) => ({
      libelle: fr.boutons.voirPiste(p.rang),
      action: ACTIONS.voirPiste(p.rang),
    })),
  });
}

async function afficherFiche(deps: DependancesParcours, envoi: Envoi, user: User, rang: number) {
  const pistes = await pistesDuDernierLot(deps.ctx.prisma, user.id);
  const piste = pistes.find((p) => p.rang === rang);
  const fiche = piste ? await construireFiche(deps.ctx.prisma, piste.id) : null;
  if (!piste || !fiche) {
    await envoi.texte(fr.nonCompris);
    return;
  }
  await sauverEtat(deps, user.id, { etape: "FICHE", donnees: { rang } });
  const messages = formaterFiche(fiche);
  const conclusion = messages.pop() ?? fr.ficheConclusion;
  await envoi.serie(messages);
  await envoi.texte(conclusion, {
    boutons: [
      { libelle: fr.boutons.choisirPiste, action: ACTIONS.choisirPiste(rang) },
      { libelle: fr.boutons.retourPistes, action: ACTIONS.retourPistes },
    ],
  });
}

// ---------------------------------------------------------------------------
// Plan et suivi (EF-07, EF-08, EF-09, EF-10)
// ---------------------------------------------------------------------------

async function choisirPiste(deps: DependancesParcours, envoi: Envoi, user: User, rang: number) {
  const { ctx } = deps;
  const piste = (await pistesDuDernierLot(ctx.prisma, user.id)).find((p) => p.rang === rang);
  if (!piste) {
    await envoi.texte(fr.nonCompris);
    return;
  }
  try {
    const plan = await creerPlan(ctx, { userId: user.id, pisteId: piste.id });
    await deps.planificateur.programmerRappels(
      plan.rappels.filter((r) => !r.envoyeLe).map((r) => ({ id: r.id, prevuLe: r.prevuLe })),
    );
    await sauverEtat(deps, user.id, { etape: "PLAN", donnees: {} });
    await envoyerPlan(deps, envoi, plan.id, { pdf: true });
  } catch (erreur) {
    if (!(erreur instanceof PlanIndisponibleError)) throw erreur;
    await envoi.texte(fr.planIndisponible);
  }
}

/** Boutons de statut d'une étape (3 boutons). */
function boutonsStatut(etapeId: string) {
  return [
    { libelle: fr.boutons.fait, action: ACTIONS.statutEtape(etapeId, "F") },
    { libelle: fr.boutons.bloque, action: ACTIONS.statutEtape(etapeId, "B") },
    { libelle: fr.boutons.abandonne, action: ACTIONS.statutEtape(etapeId, "A") },
  ];
}

/** Envoie le plan : une étape par message, l'opportunité vérifiée, le PDF, puis une action. */
export async function envoyerPlan(
  deps: DependancesParcours,
  envoi: Envoi,
  planId: string,
  options: { pdf: boolean },
) {
  const { ctx } = deps;
  const plan = await ctx.prisma.plan.findUniqueOrThrow({
    where: { id: planId },
    include: {
      etapes: {
        orderBy: { ordre: "asc" },
        include: { opportunite: { include: { partenaire: true } } },
      },
    },
  });
  const messages = formaterPlan(plan);
  const [intro, ...reste] = messages;
  const conclusion = reste.pop();
  if (intro) await envoi.texte(intro);
  for (const [index, texte] of reste.entries()) {
    const etape = plan.etapes[index];
    const actionnable = etape && (etape.statut === "A_FAIRE" || etape.statut === "BLOQUE");
    await envoi.texte(texte, actionnable ? { boutons: boutonsStatut(etape.id) } : undefined);
  }

  // EF-09 et EF-10 : opportunité vérifiée, avec "Signaler" et l'envoi du profil sur accord.
  for (const etape of plan.etapes) {
    const o = etape.opportunite;
    if (!o || o.statut !== "VERIFIEE" || !o.verifieLe) continue;
    const boutons: { libelle: string; action: string }[] = [
      { libelle: fr.boutons.signaler, action: ACTIONS.signaler(o.id) },
    ];
    if (o.partenaire?.statutValidation === "VALIDE") {
      boutons.push({ libelle: fr.boutons.postuler, action: ACTIONS.candidater(o.id) });
    }
    await envoi.texte(
      [
        fr.opportunite({
          titre: o.titre,
          lieu: o.lieu,
          contact: o.contact,
          verifieeLe: formaterDate(o.verifieLe),
        }),
        fr.conseilAntiArnaque,
      ].join("\n"),
      { boutons },
    );
  }

  if (options.pdf && deps.genererPdfPlan) {
    await envoi.document(await deps.genererPdfPlan(plan.id), "plan-sentya.pdf", fr.planPdfLegende);
  }
  if (conclusion) {
    await envoi.texte(
      conclusion,
      options.pdf || !deps.genererPdfPlan
        ? undefined
        : { boutons: [{ libelle: fr.boutonPdf, action: ACTIONS.pdf }] },
    );
  }
}

async function demanderStatutEtape(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  etapeId: string,
  code: string,
) {
  if (code === "F") {
    await changerStatutEtape(deps.ctx, { userId: user.id, etapeId, statut: "FAIT" });
    await envoi.texte(fr.statutEnregistre);
    return;
  }
  const statut = code === "B" ? "BLOQUE" : code === "A" ? "ABANDONNE" : null;
  if (!statut) {
    await envoi.texte(fr.nonCompris);
    return;
  }
  await sauverEtat(deps, user.id, {
    etape: "RAISON",
    donnees: { etapeId, statutDemande: statut, retour: etapeDeRetour(etat) },
  });
  await envoi.texte(statut === "BLOQUE" ? fr.raisonBlocage : fr.raisonAbandon);
}

async function etapeRaison(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const { etapeId, statutDemande, retour } = etat.donnees;
  const reponse = await lireReponse(
    deps,
    envoi,
    entree.message,
    fr.raisonBlocage,
    entree.derniereTentative,
  );
  if (!reponse || !etapeId || !statutDemande) {
    if (entree.message.type !== "vocal")
      await envoi.texte(statutDemande === "ABANDONNE" ? fr.raisonAbandon : fr.raisonBlocage);
    return;
  }
  // RG-08 : la raison est filtrée avant d'être stockée.
  const raison = filtrerDonneesSensibles(reponse.texte).texte.trim() || "Raison non précisée.";
  await changerStatutEtape(deps.ctx, {
    userId: user.id,
    etapeId,
    statut: statutDemande,
    raison: raison.slice(0, 300),
  });
  await sauverEtat(deps, user.id, { etape: retour ?? "PLAN", donnees: {} });
  await envoi.texte(statutDemande === "BLOQUE" ? fr.statutBloqueEnregistre : fr.statutEnregistre);
}

async function etapeSignalement(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
  entree: EntreeParcours,
) {
  const { opportuniteId, retour } = etat.donnees;
  const reponse = await lireReponse(
    deps,
    envoi,
    entree.message,
    fr.demandeMotifSignalement,
    entree.derniereTentative,
  );
  if (!reponse || !opportuniteId) {
    if (entree.message.type !== "vocal") await envoi.texte(fr.demandeMotifSignalement);
    return;
  }
  const motif = filtrerDonneesSensibles(reponse.texte).texte.trim() || "Offre suspecte.";
  const existe = await deps.ctx.prisma.opportunite.findUnique({
    where: { id: opportuniteId },
    select: { id: true },
  });
  const resultat = existe
    ? await signalerOpportunite(deps.ctx, { opportuniteId, userId: user.id, motif })
    : "DEJA_SIGNALE";
  await sauverEtat(deps, user.id, { etape: retour ?? "PLAN", donnees: {} });
  await envoi.texte(resultat === "DEJA_SIGNALE" ? fr.signalementDeja : fr.signalementMerci);
}

// ---------------------------------------------------------------------------
// Recommencer, relancer, état
// ---------------------------------------------------------------------------

async function recommencer(deps: DependancesParcours, envoi: Envoi, user: User) {
  const { prisma } = deps.ctx;
  await prisma.$transaction(async (tx) => {
    const plans = await tx.plan.findMany({
      where: { userId: user.id, actif: true },
      select: { id: true },
    });
    const ids = plans.map((p) => p.id);
    await tx.rappel.deleteMany({ where: { planId: { in: ids }, envoyeLe: null } });
    await tx.plan.updateMany({ where: { id: { in: ids } }, data: { actif: false } });
    await tx.bilanReponse.deleteMany({ where: { userId: user.id } });
    await tx.userCompetence.deleteMany({ where: { userId: user.id } });
  });
  await demarrerBilan(deps, envoi, user);
}

/** Répète ce qui est attendu à l'étape courante (après /start, une erreur, un CV...). */
async function relancer(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  etat: EtatConversation,
) {
  switch (etat.etape) {
    case "BILAN": {
      const question = trouverQuestion(etat.donnees.question ?? "") ?? QUESTIONS_BILAN[0];
      if (question) await poserQuestion(envoi, question);
      return;
    }
    case "CV":
      await envoi.texte(fr.proposerCv, {
        boutons: [{ libelle: fr.boutons.continuerSansCv, action: ACTIONS.continuerSansCv }],
      });
      return;
    case "COMPLEMENT":
      await envoi.texte(fr.aucuneCompetence);
      return;
    case "VALIDATION":
      await afficherRecap(deps, envoi, etat.donnees.competences ?? []);
      return;
    case "CORRECTION":
      await envoi.texte(fr.demandeCorrection);
      return;
    case "RAISON":
      await envoi.texte(
        etat.donnees.statutDemande === "ABANDONNE" ? fr.raisonAbandon : fr.raisonBlocage,
      );
      return;
    case "SIGNALEMENT":
      await envoi.texte(fr.demandeMotifSignalement);
      return;
    case "PISTES":
    case "FICHE": {
      const pistes = await pistesDuDernierLot(deps.ctx.prisma, user.id);
      if (pistes.length > 0) await afficherPistes(envoi, pistes);
      return;
    }
    case "PLAN": {
      const plan = await planActif(deps.ctx.prisma, user.id);
      if (plan) await envoyerPlan(deps, envoi, plan.id, { pdf: false });
      return;
    }
  }
}

async function chargerEtat(deps: DependancesParcours, userId: string): Promise<EtatConversation> {
  const ligne = await deps.ctx.prisma.conversationState.findUnique({ where: { userId } });
  if (!ligne) return { etape: "BILAN", donnees: { question: QUESTIONS_BILAN[0]?.cle } };
  return { etape: ligne.etape as Etape, donnees: (ligne.donnees ?? {}) as DonneesEtat };
}

async function sauverEtat(deps: DependancesParcours, userId: string, etat: EtatConversation) {
  const donnees = JSON.parse(JSON.stringify(etat.donnees)) as Prisma.InputJsonValue;
  await deps.ctx.prisma.conversationState.upsert({
    where: { userId },
    create: { userId, etape: etat.etape, donnees },
    update: { etape: etat.etape, donnees },
  });
}

// ---------------------------------------------------------------------------
// Vocal et indisponibilité de l'IA
// ---------------------------------------------------------------------------

/** Transcrit un vocal. Renvoie null (et prévient le jeune) si le son est inexploitable. */
async function transcrire(
  deps: DependancesParcours,
  envoi: Envoi,
  fichier: FichierEntrant,
  question: string,
  derniereTentative?: boolean,
): Promise<string | null> {
  // Pas de fournisseur audio (pas de clé Gemini) : on demande d'écrire, sans télécharger.
  if (deps.ctx.ia.audioDisponible === false) {
    await envoi.texte(fr.vocalNonDisponible);
    return null;
  }
  if (
    (fichier.dureeSecondes ?? 0) > VOCAL_SECONDES_MAX ||
    (fichier.tailleOctets ?? 0) > FICHIER_OCTETS_MAX
  ) {
    await envoi.texte(fr.vocalTropLong);
    return null;
  }
  await envoi.activite();
  const audio = await deps.canal.telechargerFichier(fichier);
  const resultat = await appelerAvecSchema(
    deps.ctx.ia,
    {
      version: PROMPT_TRANSCRIPTION.version,
      systeme: PROMPT_TRANSCRIPTION.systeme,
      texte: construireEntreeTranscription(question),
      media: {
        mimeType: fichier.mimeType || audio.mimeType || "audio/ogg",
        donnees: audio.donnees,
      },
      schema: schemaTranscription,
      delaiMs: 15_000,
      repliSiIndisponible: derniereTentative,
    },
    deps.ctx.journal,
  );
  if (!resultat.ok || resultat.donnees.inaudible || resultat.donnees.texte.trim().length === 0) {
    await envoi.texte(fr.vocalIncompris);
    return null;
  }
  return resultat.donnees.texte.trim();
}

/** L'IA est indisponible : on garde le message, on prévient, on programme un nouvel essai. */
async function mettreEnAttente(
  deps: DependancesParcours,
  envoi: Envoi,
  user: User,
  entree: EntreeParcours,
) {
  const tentative = (entree.tentative ?? 0) + 1;
  if (tentative > DELAIS_REPRISE.length) {
    // Même le dernier essai a échoué : on abandonne ce message proprement.
    await envoi.texte(fr.erreurTechnique);
    return;
  }
  const etat = await chargerEtat(deps, user.id);
  await sauverEtat(deps, user.id, {
    etape: etat.etape,
    donnees: { ...etat.donnees, enAttente: { entree: entree.message, tentative } },
  });
  await enregistrerEvenement(deps.ctx.prisma, {
    type: EVENEMENTS.IA_INDISPONIBLE,
    userHash: user.userHash,
    payload: { etape: etat.etape, tentative },
    date: deps.ctx.horloge.maintenant(),
  });
  if (tentative === 1) await envoi.texte(fr.iaIndisponible);
  const delai = DELAIS_REPRISE[tentative - 1] ?? 600;
  await deps.planificateur.programmerReprise(user.id, tentative, delai);
}

/**
 * Tâche de reprise : rejoue le message mis de côté. Au dernier essai, les étapes utilisent
 * leur repli déterministe au lieu d'attendre encore l'IA. Sans effet si le jeune a été
 * supprimé ou anonymisé entre-temps.
 */
export async function reprendreMessageEnAttente(
  deps: DependancesParcours,
  userId: string,
): Promise<boolean> {
  const user = await deps.ctx.prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.anonymiseLe || user.telegramId === null) return false;
  const etat = await chargerEtat(deps, userId);
  const attente = etat.donnees.enAttente;
  if (!attente) return false;
  await sauverEtat(deps, userId, {
    etape: etat.etape,
    donnees: { ...etat.donnees, enAttente: undefined },
  });
  await traiterMessage(deps, {
    idCanal: user.telegramId.toString(),
    message: attente.entree,
    tentative: attente.tentative,
    derniereTentative: attente.tentative >= DELAIS_REPRISE.length,
  });
  return true;
}

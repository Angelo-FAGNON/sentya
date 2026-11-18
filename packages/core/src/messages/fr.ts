// Tous les textes envoyés au jeune, en français simple, au tutoiement.
// Règles : phrases de 15 mots maximum, une seule question par message,
// 3 boutons maximum, toujours une seule action claire à la fin.
// Un test (messages.test.ts) vérifie la longueur des phrases et l'absence de caractères interdits.

export const VOIE_LIBELLE = {
  EMPLOI: "Emploi",
  FORMATION_CERTIFICATION: "Formation ou certification",
  AUTO_EMPLOI: "Ta propre activité",
} as const;

export const PAYS_LIBELLE = {
  BJ: "Bénin",
  TG: "Togo",
} as const;

export const STATUT_ETAPE_LIBELLE = {
  A_FAIRE: "À faire",
  FAIT: "Fait",
  BLOQUE: "Bloqué",
  ABANDONNE: "Abandonné",
} as const;

/** Mention imposée pour toute donnée pratique non confirmée. */
export const A_VERIFIER_PAR_CURATEUR = "À vérifier par le curateur";

export const fr = {
  // --- EF-01 Accueil et consentement ---
  accueil: [
    "Salut ! Je suis Sentya, ton conseiller d'orientation. C'est gratuit.",
    "Tu me racontes ce que tu sais faire. Je te propose 3 pistes de métier.",
    "Ensuite, on prépare ensemble un plan en 3 étapes. Tu vis dans quel pays ?",
  ],
  boutons: {
    benin: "Bénin",
    togo: "Togo",
    accepte: "J'accepte",
    plusTard: "Plus tard",
    majeur: "J'ai 18 ans ou plus",
    mineur: "J'ai moins de 18 ans",
    oui: "Oui",
    non: "Non",
    corriger: "Corriger",
    pasDeDiplome: "Pas de diplôme",
    objectifEmploi: "Un emploi",
    objectifFormation: "Une formation",
    objectifActivite: "Ma propre activité",
    continuerSansCv: "Continuer sans CV",
    voirPiste: (rang: number) => `Voir la piste ${rang}`,
    choisirPiste: "Choisir cette piste",
    retourPistes: "Retour aux pistes",
    fait: "Fait",
    bloque: "Bloqué",
    abandonne: "Abandonné",
    signaler: "Signaler",
    postuler: "Envoyer mon profil",
    ouiEnvoie: "Oui, envoie",
    activerAudio: "Activer l'audio",
    desactiverAudio: "Désactiver l'audio",
    ouiEffacer: "Oui, tout effacer",
    jeConfirme: "Je confirme",
    annuler: "Annuler",
    ouiRecommencer: "Oui, recommencer",
    ouvrirPlan: "Ouvrir mon plan",
    etapeSuivante: "Étape suivante",
    voirPlan: "Voir mon plan",
  },
  consentement: (urlConfidentialite: string) =>
    [
      "Pour t'aider, je garde tes réponses dans ma base.",
      "Je ne partage rien sans ton accord.",
      "Tu peux tout effacer avec /supprimer.",
      `Les règles sont ici : ${urlConfidentialite}`,
      "Tu es d'accord ?",
    ].join("\n"),
  plusTard: "Pas de souci. Reviens quand tu veux avec /start.",
  questionAge: "Dernière question avant de commencer. As-tu 18 ans ou plus ?",
  mineur: [
    "Merci pour ta franchise. Sentya est réservé aux 18 ans et plus.",
    "Parle de ton projet à un conseiller de ton école ou de ta commune.",
    "L'agence nationale pour l'emploi de ton pays peut aussi t'orienter.",
    "Je n'ai rien gardé de cette conversation.",
  ].join("\n"),

  // --- EF-02 Bilan ---
  debutBilan: "Merci ! On commence ton bilan. Réponds par écrit ou par vocal.",
  questions: {
    activites:
      "Raconte-moi ce que tu fais ou as déjà fait. Travail, apprentissage, famille, commerce, études : tout compte.",
    duree: "Depuis combien de temps fais-tu chacune de ces activités ?",
    aime: "Qu'est-ce que tu aimes le plus faire ?",
    ville: "Tu vis dans quelle ville ?",
    etudes: "Quel est ton niveau d'études ? Écris ta réponse ou appuie sur le bouton.",
    objectif: "Que veux-tu en priorité ? Tu ne sais pas encore ? Écris-le simplement.",
  },
  reprise: "Bon retour ! On reprend là où on s'était arrêtés.",
  ecouteVocal: "J'écoute ton vocal...",
  vocalIncompris: "Je n'ai pas bien compris ton vocal. Tu peux le redire ou l'écrire ?",
  reponseTropCourte: "Dis-m'en un peu plus, en une ou deux phrases.",
  donneesSensiblesRetirees:
    "Je n'ai pas gardé une info privée : santé, religion, origine ou politique. Ce n'est pas utile ici.",

  // --- EF-03 et EF-04 Compétences et CV ---
  recapCompetences: (libelles: string[]) =>
    ["J'ai repéré ces compétences :", ...libelles.map((l) => `- ${l}`), "C'est juste ?"].join("\n"),
  aucuneCompetence:
    "Je n'ai pas encore repéré de compétence précise. Raconte-moi une tâche que tu fais souvent.",
  demandeCorrection: "Dis-moi quoi ajouter ou retirer. Par écrit ou par vocal.",
  correctionAppliquee: "C'est noté. Voici la liste mise à jour.",
  proposerCv: "Tu as un CV ? Envoie-le en PDF ou en photo. Sinon, continue sans.",
  cvLu: "Merci. J'ai lu ton CV, puis je l'ai supprimé.",
  cvIllisible: "Je n'ai pas pu lire ce fichier. Envoie un PDF ou une photo nette.",
  fichierTropLourd: "Ce fichier est trop lourd. Envoie un fichier de moins de 10 Mo.",

  // --- EF-05 et EF-06 Pistes ---
  jeReflechis: "Je réfléchis...",
  introPistes: "Voici 3 pistes pour toi. Ce sont des suggestions : c'est toi qui décides.",
  piste: (p: {
    rang: number;
    libelle: string;
    voie: string;
    raison: string;
    condition: string;
    source: string;
    aExplorer: boolean;
  }) =>
    [
      `${p.rang}. ${p.libelle} (${p.voie})`,
      p.raison,
      `Condition : ${p.condition}`,
      p.aExplorer ? "Piste à explorer : vérifie-la avec un conseiller." : null,
      p.source,
    ]
      .filter(Boolean)
      .join("\n"),
  choisirUnePiste: "Laquelle veux-tu regarder de plus près ?",
  // Textes du repli déterministe (sans IA), pour les pistes "à explorer".
  raisonRepli: (competences: string[]) =>
    competences.length > 0
      ? `Ton expérience en ${competences.slice(0, 2).join(" et ")} sert dans ce métier.`
      : "Ce métier peut correspondre à ton objectif. Prends le temps de l'explorer.",
  conditionRepli: (premiereEtape: string | undefined) =>
    premiereEtape
      ? `Commence par : ${premiereEtape}.`
      : "Renseigne-toi auprès d'un professionnel du métier.",
  ficheTitre: (libelle: string, voie: string) => `${libelle} (${voie})`,
  ficheOuExiste: (lieux: string) => `Où on le trouve : ${lieux}`,
  ficheDuree: (duree: string) => `Durée indicative : ${duree}`,
  ficheCout: (cout: string) => `Coût indicatif : ${cout}`,
  ficheProgrammes: "Programmes publics utiles :",
  ficheAucunProgramme: "Aucun programme public enregistré pour cette piste.",
  ficheConclusion: "La décision t'appartient. Tu choisis cette piste ?",

  // --- RG-04 Sources et dates ---
  source: (domaine: string, etat: string) => `Source : ${domaine}, ${etat}`,
  verifieeLe: (date: string) => `Vérifiée le ${date}`,
  aVerifier: "à vérifier",

  // --- EF-07 Plan ---
  introPlan: "Voici ton plan en 3 étapes.",
  etape: (e: { ordre: number; titre: string; details: string; echeance: string; source: string }) =>
    [`Étape ${e.ordre} : ${e.titre}`, e.details, `À faire avant le ${e.echeance}.`, e.source].join(
      "\n",
    ),
  conclusionPlan: (titrePremiereEtape: string) =>
    `Je te rappelle dans 3 jours. Ta première action : ${titrePremiereEtape}.`,
  planPdfLegende: "Ton plan Sentya, à garder sur ton téléphone.",
  planIndisponible:
    "Je n'ai pas encore d'étapes pour cette piste. Choisis une autre piste pour l'instant.",

  // --- EF-08 Rappels et suivi ---
  rappel: (jours: number) => `Bonjour ! Cela fait ${jours} jours. Où en es-tu avec ton plan ?`,
  rappelEtape: (ordre: number, titre: string, statut: string) =>
    `Étape ${ordre} : ${titre}. Statut : ${statut}.`,
  rappelToutFait: "Bravo, tu as fait toutes tes étapes ! Tu peux revoir tes pistes avec /changer.",
  questionStatutEtape: "Où en es-tu avec cette étape ?",
  raisonBlocage: "Qu'est-ce qui te bloque ? Réponds en une phrase.",
  raisonAbandon: "Pourquoi arrêtes-tu cette étape ? Réponds en une phrase.",
  statutEnregistre: "C'est noté. Continue comme ça !",
  statutBloqueEnregistre:
    "C'est noté. Un blocage, c'est normal. Regarde les contacts de l'étape pour avancer.",
  aucunPlan: "Tu n'as pas encore de plan. Continuons ton bilan.",
  changerPiste: "D'accord. Revoyons tes pistes.",
  confirmerRecommencer: "Tu veux refaire ton bilan depuis le début ? Ton plan actuel sera arrêté.",
  recommencerAnnule: "D'accord, on garde ton plan actuel.",

  // --- EF-09, EF-10, RG-07 Opportunités ---
  opportunite: (o: { titre: string; lieu: string; contact: string; verifieeLe: string }) =>
    [o.titre, `Lieu : ${o.lieu}`, `Contact : ${o.contact}`, `Vérifiée le ${o.verifieeLe}`].join(
      "\n",
    ),
  conseilAntiArnaque: "Attention : une vraie offre ne demande jamais d'argent au candidat.",
  demandeMotifSignalement: "Pourquoi cette offre te semble suspecte ? Réponds en une phrase.",
  signalementMerci: "Merci pour ton signalement. Notre équipe va vérifier cette offre.",
  signalementDeja: "Tu as déjà signalé cette offre. Merci pour ta vigilance !",
  consentementCandidature: (partenaire: string) =>
    [
      `Je peux envoyer ton profil à ${partenaire} pour cette offre.`,
      "Ton prénom, ta ville, ton niveau d'études et tes compétences seront partagés.",
      "Tu es d'accord ?",
    ].join("\n"),
  candidatureEnvoyee: "C'est envoyé. L'organisation te contactera si ton profil l'intéresse.",
  candidatureAnnulee: "D'accord, je n'envoie rien.",
  candidatureImpossible: "Cette offre n'est plus disponible.",

  // --- EF-11 Lien magique ---
  lienPlan: "Voici ton lien pour voir ton plan sur le web. Il marche une fois, pendant 15 minutes.",

  // --- EF-14 Paramètres ---
  parametres: (audioActif: boolean) =>
    `Réponses en audio : ${audioActif ? "activées" : "désactivées"}. Tu veux changer ?`,
  audioActive: "C'est fait. Je t'enverrai aussi mes réponses en audio.",
  audioDesactive: "C'est fait. Je t'enverrai seulement du texte.",

  // --- RG-11 Suppression ---
  supprimerEtape1: "Tu veux effacer toutes tes données ? C'est définitif.",
  supprimerEtape2: "Dernière confirmation. Bilan, pistes et plan seront effacés. On efface ?",
  supprimerFait: "C'est fait. Toutes tes données sont effacées. Bonne route !",
  supprimerAnnule: "D'accord, je ne supprime rien.",
  aucuneDonnee: "Je n'ai aucune donnée sur toi. Tape /start pour commencer.",

  // --- Erreurs et cas limites ---
  iaIndisponible: "Je reviens vers toi dans quelques minutes.",
  erreurTechnique: "Oups, un problème technique. Réessaie dans un instant.",
  tropRapide: "Tu vas un peu vite. Attends une minute, puis réessaie.",
  nonCompris: "Je n'ai pas compris. Utilise les boutons ou réponds à la question.",
  commencerParStart: "Tape /start pour commencer.",
  boutonPdf: "Recevoir en PDF",
  vocalTropLong: "Ton vocal est trop long. Envoie un vocal de moins de 3 minutes.",

  // --- Menu des commandes affiché par Telegram ---
  commandes: {
    start: "Commencer ou reprendre",
    plan: "Voir mon plan",
    changer: "Changer de piste",
    recommencer: "Refaire mon bilan",
    monplan: "Voir mon plan sur le web",
    parametres: "Réponses en audio",
    supprimer: "Effacer mes données",
  },

  // --- PDF du plan ---
  pdf: {
    titre: "Mon plan Sentya",
    pisteChoisie: (libelle: string, voie: string) => `Piste choisie : ${libelle} (${voie})`,
    creeLe: (date: string) => `Plan créé le ${date}`,
    etapeTitre: (ordre: number, titre: string) => `Étape ${ordre} : ${titre}`,
    echeance: (date: string) => `À faire avant le ${date}`,
    statutEtape: (statut: string) => `Statut : ${statut}`,
    piedDePage: "Ces pistes sont des suggestions. La décision t'appartient. Sentya est gratuit.",
  },
} as const;

export type Messages = typeof fr;

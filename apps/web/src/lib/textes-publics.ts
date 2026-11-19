// Textes des pages publiques, en français simple et au tutoiement.
// Règle : 15 mots maximum par phrase (vérifié par test/textes-publics.test.ts).
// Seule exception : la promesse, imposée mot pour mot.

export interface Section {
  titre: string;
  paragraphes: string[];
}

export const PROMESSE =
  "En moins de 15 minutes, passe de « je ne sais pas quoi faire » à un plan en 3 étapes vérifiées.";

export const accueil = {
  titre: "Sentya, ton conseiller d'orientation sur Telegram",
  etapes: [
    {
      nom: "Raconter",
      texte: "Tu racontes ce que tu sais faire. Par écrit ou en vocal.",
    },
    {
      nom: "Choisir",
      texte: "Sentya te propose 3 pistes de métiers. Tu choisis celle qui te plaît.",
    },
    {
      nom: "Avancer",
      texte: "Tu reçois un plan en 3 étapes vérifiées. Sentya te relance pour avancer.",
    },
  ],
  gratuit: "C'est gratuit. Aucun paiement ne te sera jamais demandé.",
  pays: "Pour les jeunes de 18 ans et plus, au Bénin et au Togo.",
  bouton: "Ouvrir Sentya sur Telegram",
  qrTitre: "Sur ordinateur ? Scanne ce code avec ton téléphone.",
  qrAlternative: "Code QR qui ouvre Sentya dans Telegram. Tu peux aussi utiliser le lien",
};

export const confidentialite: { titre: string; intro: string; sections: Section[] } = {
  titre: "Politique de confidentialité",
  intro: "Voici ce que Sentya garde sur toi, et pourquoi. On t'explique simplement.",
  sections: [
    {
      titre: "Avant ton accord, rien n'est gardé",
      paragraphes: [
        "Tant que tu n'as pas dit oui, Sentya n'enregistre rien sur toi.",
        "Tu dois aussi confirmer que tu as 18 ans ou plus.",
      ],
    },
    {
      titre: "Ce que Sentya garde",
      paragraphes: [
        "Ton prénom si tu le donnes, ton pays et ta ville.",
        "Tes réponses aux questions du bilan, et tes compétences.",
        "Les pistes proposées, ton plan et l'avancement de tes étapes.",
        "Ton identifiant Telegram, pour t'envoyer les rappels.",
      ],
    },
    {
      titre: "Pourquoi",
      paragraphes: [
        "Ces informations servent à te proposer des pistes et un plan adaptés.",
        "Elles servent aussi à t'envoyer des rappels pour avancer.",
        "Les statistiques sont calculées sans ton nom ni ton identifiant.",
      ],
    },
    {
      titre: "Pas de données sensibles",
      paragraphes: [
        "Sentya ne te demande jamais ta religion, ta santé ou tes opinions.",
        "Si tu en parles, Sentya retire ces passages avant de les garder.",
      ],
    },
    {
      titre: "L'intelligence artificielle",
      paragraphes: [
        "Tes messages écrits et ton CV sont traités par Claude, un service d'Anthropic.",
        "Tes messages vocaux sont transcrits par Gemini, un service de Google.",
        "Avant l'envoi, Sentya retire les noms, numéros et adresses qu'il repère.",
        "L'IA aide à comprendre tes réponses. Les informations pratiques viennent de sources vérifiées.",
      ],
    },
    {
      titre: "Partage avec un partenaire",
      paragraphes: [
        "Sentya ne partage ton profil qu'avec ton accord clair.",
        "Cet accord vaut pour une seule offre à la fois.",
        "Le partenaire voit ton prénom, ta ville, ton niveau d'études et tes compétences.",
      ],
    },
    {
      titre: "Combien de temps",
      paragraphes: [
        "Après 12 mois sans activité, ton profil est rendu anonyme.",
        "Ton prénom, ta ville et ton identifiant Telegram sont alors effacés.",
      ],
    },
    {
      titre: "Effacer tes données",
      paragraphes: [
        "Tape /supprimer dans Telegram. Tout est effacé tout de suite.",
        "Tu peux aussi lire la page sur la suppression des données.",
      ],
    },
  ],
};

export const conditions: { titre: string; intro: string; sections: Section[] } = {
  titre: "Conditions d'utilisation",
  intro: "Ces règles sont simples. Lis-les avant d'utiliser Sentya.",
  sections: [
    {
      titre: "Des suggestions, pas des ordres",
      paragraphes: [
        "Sentya te fait des suggestions de métiers et d'étapes.",
        "La décision t'appartient toujours. Tu restes libre de tes choix.",
      ],
    },
    {
      titre: "Aucun résultat promis",
      paragraphes: [
        "Sentya ne promet ni emploi, ni place en formation, ni revenu.",
        "Les informations sont vérifiées, mais elles peuvent changer. Vérifie toujours la source.",
      ],
    },
    {
      titre: "C'est gratuit",
      paragraphes: [
        "Sentya est gratuit. Personne ne doit te demander de l'argent en son nom.",
        "Une offre demande de l'argent ? C'est sûrement une arnaque. Signale-la.",
      ],
    },
    {
      titre: "Réservé aux 18 ans et plus",
      paragraphes: ["Tu dois avoir 18 ans ou plus pour utiliser Sentya."],
    },
    {
      titre: "Respect",
      paragraphes: [
        "Utilise Sentya pour ton orientation, sans fausses informations.",
        "Ne donne pas d'informations sur d'autres personnes.",
      ],
    },
  ],
};

export const suppression: { titre: string; intro: string; sections: Section[] } = {
  titre: "Supprimer tes données",
  intro: "Tu peux effacer toutes tes données à tout moment. C'est simple et gratuit.",
  sections: [
    {
      titre: "Comment faire",
      paragraphes: [
        "Ouvre ta conversation avec Sentya dans Telegram.",
        "Tape la commande /supprimer et envoie-la.",
      ],
    },
    {
      titre: "Deux confirmations",
      paragraphes: [
        "Sentya te demande de confirmer une première fois.",
        "Puis une deuxième fois, pour éviter une erreur.",
      ],
    },
    {
      titre: "Effacement immédiat",
      paragraphes: [
        "Après la deuxième confirmation, tout est effacé tout de suite.",
        "Ton bilan, tes compétences, tes pistes et ton plan disparaissent vraiment.",
        "Les rappels prévus sont annulés.",
        "Seuls des chiffres anonymes restent, sans lien avec toi.",
      ],
    },
    {
      titre: "Et après ?",
      paragraphes: ["Tu peux revenir quand tu veux. Tu recommenceras alors depuis le début."],
    },
  ],
};

export const monPlan = {
  titre: "Mon plan",
  intro: "Ce lien ne marche qu'une seule fois. Ouvre-le quand tu es prêt.",
  bouton: "Voir mon plan",
  expire:
    "Ce lien a déjà servi ou a expiré. Tape /monplan dans Telegram pour en recevoir un nouveau.",
  sansPlan: "Tu n'as pas encore de plan actif. Retourne dans Telegram pour en créer un.",
  rappel: "Pour revoir ton plan plus tard, tape /monplan dans Telegram.",
};

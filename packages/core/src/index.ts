// Point d'entrée du noyau métier de Sentya, partagé par le bot et le site web.
export * from "./config";
export * from "./contexte";
export * from "./dates";
export * from "./horloge";
export * from "./journal";
export * from "./texte";

export * from "./canal/canal";
export * from "./messages/fr";

export * from "./confidentialite/donnees-sensibles";
export * from "./confidentialite/hachage";
export * from "./confidentialite/pseudonymisation";

export * from "./ia/appel-structure";
export * from "./ia/factice";
export * from "./ia/fournisseur";
export * from "./ia/gemini";
export * from "./ia/schemas";

export * from "./prompts/choix-pistes.v1";
export * from "./prompts/correction-competences.v1";
export * from "./prompts/extraction-competences.v1";
export * from "./prompts/reformulation.v1";
export * from "./prompts/transcription.v1";

export * from "./orientation/bilan";
export * from "./orientation/competences";
export * from "./orientation/fiche";
export * from "./orientation/pistes";
export * from "./orientation/plan";
export * from "./orientation/preselection";
export * from "./orientation/profil";

export * from "./regles/anonymisation";
export * from "./regles/candidature";
export * from "./regles/consentement";
export * from "./regles/eligibilite";
export * from "./regles/fraude";
export * from "./regles/lien-magique";
export * from "./regles/peremption";
export * from "./regles/rappels";
export * from "./regles/sources";
export * from "./regles/suppression";

export * from "./analytique/evenements";
export * from "./analytique/indicateurs";
export * from "./qualite/revue";

export * from "./parcours/actions";
export * from "./parcours/envoi";
export * from "./parcours/moteur";
export * from "./parcours/rappels";
export * from "./parcours/types";

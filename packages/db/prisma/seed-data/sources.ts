// Sources officielles utilisées par le seed (jeu de démonstration, hypothèse H1).
//
// Pages vérifiées le 18 novembre 2026 (lecture du contenu de chaque page) :
//
// Bénin
// - https://www.gouv.bj/article/3006/emploi-benin-milliers-jeunes-instruits-immersion-sonama-esmer-academy-biophyto-grace-programme-azoli/
//   Programme Azôli de l'AnpE : jeunes de 18 à 30 ans peu ou pas instruits, inscription
//   sur la plateforme https://www.sica.anpe.bj (citée par l'article).
// - https://www.gouv.bj/article/2786/emploi-benin-encore-nouveaux-beneficiaires-azoli-integres-gdiz/
//   Azôli : programme du Gouvernement mis en œuvre par l'AnpE, emploi salarié et auto-emploi.
// - https://sica.anpe.bj/
//   Plateforme d'inscription de l'AnpE (répond 200, contenu chargé par script).
//   La forme avec "www." ne répond pas : on utilise https://sica.anpe.bj.
// - https://www.gouv.bj/article/2425/lancement-examen-renove-session-octobre-2023-nouvelle-ere/
//   CQM : examen des apprentis et artisans, organisé par la Chambre des Métiers de
//   l'Artisanat du Bénin (CMA-Bénin) avec la Direction des Examens et Concours.
// - https://www.gouv.bj/article/3324/certificat-qualification-metiers-session-octobre-2025-41.943-candidats-assaut-diplome-professionnel/
//   CQM, session d'octobre 2025 : reconnaissance officielle des compétences des artisans et apprentis.
// - https://www.enseignementsecondaire.gouv.bj/actualite/nouvelles/492/formation-pour-lobtention-du-cqp-un-premier-test-organise-pour-recruter-2000-jeunes
//   CQP : test national d'accès à la formation duale (ProDIJ), avec la CMA-Bénin.
// - https://cmabenin.bj/
//   Site de la CMA-Bénin (rubrique services : CQM).
// - Non utilisé : https://anpe.bj répondait 503 (service indisponible) le jour de la vérification.
//
// Togo
// - https://anpetogo.org/
//   Site de l'ANPE Togo.
// - https://anpetogo.org/programmes/aide
//   Programme d'appui à l'insertion et au développement de l'embauche (AIDE) : stage
//   pour jeunes diplômés primo-demandeurs d'emploi, Togolais de 18 à 40 ans.
// - https://anpetogo.org/entrepreneuriat/accompagnement
//   Accompagnement des porteurs de projet par un conseiller de l'ANPE.
// - https://anpetogo.org/formations
//   Ateliers de l'ANPE (techniques de recherche d'emploi, savoir-être).
// - https://togoanvt.org/nos-volontariats/
//   Agence nationale du volontariat au Togo (ANVT) : types de volontariat et conditions.
// - https://togoanvt.org/inscription-volontaire/
//   Page d'inscription des volontaires (lien relevé sur l'accueil de togoanvt.org).
// Remarque : anpetogo.org/programmes/aide et togoanvt.org répondent 406 à curl
// (filtre anti-robots), mais leur contenu a été lu avec un navigateur de lecture.

export const SOURCES = {
  bjAzoli:
    "https://www.gouv.bj/article/3006/emploi-benin-milliers-jeunes-instruits-immersion-sonama-esmer-academy-biophyto-grace-programme-azoli/",
  bjAzoliGdiz:
    "https://www.gouv.bj/article/2786/emploi-benin-encore-nouveaux-beneficiaires-azoli-integres-gdiz/",
  bjSicaAnpe: "https://sica.anpe.bj",
  bjCqm:
    "https://www.gouv.bj/article/3324/certificat-qualification-metiers-session-octobre-2025-41.943-candidats-assaut-diplome-professionnel/",
  bjCqmRenove:
    "https://www.gouv.bj/article/2425/lancement-examen-renove-session-octobre-2023-nouvelle-ere/",
  bjCqp:
    "https://www.enseignementsecondaire.gouv.bj/actualite/nouvelles/492/formation-pour-lobtention-du-cqp-un-premier-test-organise-pour-recruter-2000-jeunes",
  bjCmaBenin: "https://cmabenin.bj/",
  tgAnpe: "https://anpetogo.org/",
  tgAide: "https://anpetogo.org/programmes/aide",
  tgEntrepreneuriat: "https://anpetogo.org/entrepreneuriat/accompagnement",
  tgFormations: "https://anpetogo.org/formations",
  tgAnvt: "https://togoanvt.org/nos-volontariats/",
  tgAnvtInscription: "https://togoanvt.org/inscription-volontaire/",
} as const;

/** Mention affichée quand une information n'a pas pu être confirmée. */
export const A_VERIFIER = "À vérifier par le curateur";

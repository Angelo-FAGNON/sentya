// Référentiel des compétences, commun au Bénin et au Togo (hypothèse H5).
// Les synonymes reprennent des formulations orales de jeunes : ils servent au repli
// sans IA (correspondanceDeterministe dans @sentya/core). Chaque synonyme contient
// au moins un mot distinctif de 4 lettres ou plus, pour éviter les faux positifs.

export interface CompetenceSeed {
  id: string;
  libelle: string;
  domaine: string;
  synonymes: string[];
}

export const COMPETENCES: CompetenceSeed[] = [
  // Artisanat
  {
    id: "couture-retouche",
    libelle: "Couture et retouche",
    domaine: "artisanat",
    synonymes: [
      "je couds les habits",
      "coudre des vêtements",
      "retouche de pagnes",
      "machine à coudre",
      "tailleur",
    ],
  },
  {
    id: "coupe-patronage",
    libelle: "Coupe et patronage",
    domaine: "artisanat",
    synonymes: [
      "je prends les mesures des clients",
      "couper le tissu",
      "tracer des patrons",
      "modèles de tenues",
    ],
  },
  {
    id: "broderie-tricot",
    libelle: "Broderie et tricot",
    domaine: "artisanat",
    synonymes: ["je brode les tenues", "broderie à la main", "tricoter", "crochet"],
  },
  {
    id: "tissage-teinture",
    libelle: "Tissage et teinture",
    domaine: "artisanat",
    synonymes: ["tissage du pagne", "teinture batik", "je teins les tissus", "métier à tisser"],
  },
  {
    id: "travail-du-bois",
    libelle: "Travail du bois",
    domaine: "artisanat",
    synonymes: [
      "je fabrique des meubles",
      "menuisier",
      "raboter le bois",
      "scier les planches",
      "ébéniste",
    ],
  },
  {
    id: "soudure-metallique",
    libelle: "Soudure et construction métallique",
    domaine: "artisanat",
    synonymes: [
      "je soude le fer",
      "poste à souder",
      "fabriquer des portails",
      "soudeur",
      "ferronnerie",
    ],
  },
  {
    id: "cordonnerie-maroquinerie",
    libelle: "Cordonnerie et maroquinerie",
    domaine: "artisanat",
    synonymes: ["je répare les chaussures", "cordonnier", "sacs en cuir", "fabriquer des sandales"],
  },
  {
    id: "vannerie-poterie",
    libelle: "Vannerie et poterie",
    domaine: "artisanat",
    synonymes: ["tresser des paniers", "poterie", "fabriquer des canaris", "travailler l'argile"],
  },
  {
    id: "sculpture-objets-art",
    libelle: "Sculpture et objets d'art",
    domaine: "artisanat",
    synonymes: [
      "sculpter le bois",
      "objets décoratifs",
      "statuettes",
      "bijoux artisanaux",
      "perles",
    ],
  },

  // Mécanique
  {
    id: "mecanique-moto",
    libelle: "Mécanique moto",
    domaine: "mecanique",
    synonymes: [
      "je répare les motos",
      "réparer les zémidjans",
      "mécanicien moto",
      "vidange moteur",
      "taxi-moto en panne",
    ],
  },
  {
    id: "mecanique-auto",
    libelle: "Mécanique automobile",
    domaine: "mecanique",
    synonymes: ["je répare les voitures", "garage auto", "mécanicien voiture", "diagnostic moteur"],
  },
  {
    id: "reparation-velos-pneus",
    libelle: "Réparation de vélos et de pneus",
    domaine: "mecanique",
    synonymes: [
      "réparer les vélos",
      "vulcanisateur",
      "je répare les pneus",
      "chambre à air crevée",
    ],
  },
  {
    id: "maintenance-groupe-electrogene",
    libelle: "Maintenance de groupes électrogènes",
    domaine: "mecanique",
    synonymes: [
      "réparer les groupes électrogènes",
      "entretien du groupe électrogène",
      "bobinage",
      "groupe qui ne démarre pas",
    ],
  },
  {
    id: "conduite-vehicule",
    libelle: "Conduite de véhicule",
    domaine: "mecanique",
    synonymes: [
      "je conduis la moto",
      "permis de conduire",
      "chauffeur",
      "conduire un taxi",
      "zémidjan",
    ],
  },
  {
    id: "outillage-mesure",
    libelle: "Utilisation des outils et des mesures",
    domaine: "mecanique",
    synonymes: ["mètre ruban", "outils de mesure", "clé et tournevis", "boîte à outils"],
  },

  // Électricité et électronique
  {
    id: "electricite-batiment",
    libelle: "Installation électrique du bâtiment",
    domaine: "electricite",
    synonymes: [
      "je fais le courant dans les maisons",
      "électricien",
      "câblage",
      "installer des prises",
      "tableau électrique",
    ],
  },
  {
    id: "froid-climatisation",
    libelle: "Froid et climatisation",
    domaine: "electricite",
    synonymes: [
      "réparer les climatiseurs",
      "frigoriste",
      "recharge de gaz frigo",
      "réparer les congélateurs",
    ],
  },
  {
    id: "energie-solaire",
    libelle: "Installation solaire",
    domaine: "electricite",
    synonymes: ["panneaux solaires", "installer le solaire", "batteries solaires", "kit solaire"],
  },
  {
    id: "reparation-electronique",
    libelle: "Réparation électronique",
    domaine: "electricite",
    synonymes: [
      "réparer les télévisions",
      "carte électronique",
      "souder les cartes",
      "réparer les radios",
    ],
  },
  {
    id: "reparation-telephone",
    libelle: "Réparation de téléphones",
    domaine: "electricite",
    synonymes: [
      "je répare les téléphones",
      "changer l'écran du téléphone",
      "flasher les portables",
      "réparateur de portables",
    ],
  },

  // Bâtiment
  {
    id: "maconnerie",
    libelle: "Maçonnerie",
    domaine: "batiment",
    synonymes: ["je fais la maçonnerie", "monter les murs", "aide-maçon", "coffrage", "béton"],
  },
  {
    id: "plomberie",
    libelle: "Plomberie",
    domaine: "batiment",
    synonymes: [
      "plombier",
      "réparer les tuyaux",
      "changer les robinets",
      "installer les sanitaires",
      "fuite d'eau",
    ],
  },
  {
    id: "carrelage",
    libelle: "Carrelage",
    domaine: "batiment",
    synonymes: ["poser le carreau", "carreleur", "carrelage de sol"],
  },
  {
    id: "peinture-batiment",
    libelle: "Peinture du bâtiment",
    domaine: "batiment",
    synonymes: ["peindre les maisons", "peintre en bâtiment", "enduit", "peinture des murs"],
  },
  {
    id: "lecture-plans",
    libelle: "Lecture de plans",
    domaine: "batiment",
    synonymes: ["lire un plan", "plans de maison", "dessin technique", "schéma électrique"],
  },
  {
    id: "travaux-chantier",
    libelle: "Travaux de chantier et manutention",
    domaine: "batiment",
    synonymes: [
      "porter les charges",
      "manœuvre sur chantier",
      "travaux de chantier",
      "décharger les camions",
    ],
  },

  // Commerce
  {
    id: "vente-negociation",
    libelle: "Vente et négociation",
    domaine: "commerce",
    synonymes: [
      "je vends au marché",
      "négocier les prix",
      "marchander",
      "vendeuse",
      "petit commerce",
    ],
  },
  {
    id: "tenue-boutique",
    libelle: "Tenue de boutique",
    domaine: "commerce",
    synonymes: ["je tiens une boutique", "gérer la boutique", "ranger les marchandises", "kiosque"],
  },
  {
    id: "approvisionnement-stock",
    libelle: "Approvisionnement et gestion de stock",
    domaine: "commerce",
    synonymes: [
      "acheter la marchandise en gros",
      "gérer le stock",
      "inventaire",
      "commander chez les grossistes",
    ],
  },
  {
    id: "relation-client",
    libelle: "Relation client",
    domaine: "commerce",
    synonymes: [
      "accueillir les clients",
      "fidéliser la clientèle",
      "service client",
      "répondre aux clients",
    ],
  },
  {
    id: "caisse-monnaie",
    libelle: "Caisse et rendu de monnaie",
    domaine: "commerce",
    synonymes: ["tenir la caisse", "rendre la monnaie", "caissière", "compter la recette"],
  },
  {
    id: "vente-ambulante",
    libelle: "Vente ambulante",
    domaine: "commerce",
    synonymes: [
      "je vends dans la rue",
      "vente ambulante",
      "vendre au carrefour",
      "marchandise sur la tête",
    ],
  },
  {
    id: "mobile-money",
    libelle: "Transferts d'argent mobile",
    domaine: "commerce",
    synonymes: ["mobile money", "momo", "flooz", "tmoney", "cabine de transfert"],
  },
  {
    id: "promotion-publicite",
    libelle: "Promotion et publicité",
    domaine: "commerce",
    synonymes: [
      "faire de la publicité",
      "attirer les clients",
      "affiches publicitaires",
      "promotion des produits",
    ],
  },

  // Numérique
  {
    id: "bureautique",
    libelle: "Bureautique",
    domaine: "numerique",
    synonymes: ["word et excel", "traitement de texte", "saisie de documents", "tableur"],
  },
  {
    id: "utilisation-ordinateur",
    libelle: "Utilisation de l'ordinateur",
    domaine: "numerique",
    synonymes: [
      "je sais utiliser l'ordinateur",
      "informatique de base",
      "envoyer des courriels",
      "naviguer sur internet",
    ],
  },
  {
    id: "developpement-web",
    libelle: "Développement web",
    domaine: "numerique",
    synonymes: [
      "créer des sites internet",
      "html et css",
      "programmation",
      "javascript",
      "coder des applications",
    ],
  },
  {
    id: "reseaux-sociaux",
    libelle: "Gestion des réseaux sociaux",
    domaine: "numerique",
    synonymes: [
      "je gère une page facebook",
      "publier sur tiktok",
      "community manager",
      "statuts whatsapp pour vendre",
    ],
  },
  {
    id: "graphisme",
    libelle: "Graphisme et design",
    domaine: "numerique",
    synonymes: ["faire des affiches", "canva", "photoshop", "créer des logos"],
  },
  {
    id: "photographie",
    libelle: "Photographie",
    domaine: "numerique",
    synonymes: ["prendre des photos", "photographe", "appareil photo", "photos de mariage"],
  },
  {
    id: "video-montage",
    libelle: "Vidéo et montage",
    domaine: "numerique",
    synonymes: ["filmer les cérémonies", "montage vidéo", "caméraman", "capcut"],
  },
  {
    id: "maintenance-informatique",
    libelle: "Maintenance informatique",
    domaine: "numerique",
    synonymes: [
      "réparer les ordinateurs",
      "installer windows",
      "formater un ordinateur",
      "antivirus",
    ],
  },
  {
    id: "services-cybercafe",
    libelle: "Services de cybercafé",
    domaine: "numerique",
    synonymes: ["photocopie", "imprimer des documents", "cybercafé", "plastification"],
  },
  {
    id: "usage-smartphone",
    libelle: "Usage du smartphone et des applications",
    domaine: "numerique",
    synonymes: ["je me débrouille avec le smartphone", "télécharger des applications", "android"],
  },

  // Agroalimentaire
  {
    id: "transformation-agroalimentaire",
    libelle: "Transformation de produits agricoles",
    domaine: "agroalimentaire",
    synonymes: [
      "faire du gari",
      "transformer le manioc",
      "huile de palme",
      "beurre de karité",
      "jus de fruits",
    ],
  },
  {
    id: "cuisine-restauration",
    libelle: "Cuisine",
    domaine: "agroalimentaire",
    synonymes: ["je fais la cuisine", "préparer les repas", "cuisinière", "plats locaux", "maquis"],
  },
  {
    id: "patisserie-boulangerie",
    libelle: "Pâtisserie et boulangerie",
    domaine: "agroalimentaire",
    synonymes: ["faire des gâteaux", "pâtissier", "boulangerie", "four à pain", "beignets"],
  },
  {
    id: "hygiene-alimentaire",
    libelle: "Hygiène alimentaire",
    domaine: "agroalimentaire",
    synonymes: [
      "propreté de la cuisine",
      "conserver les aliments",
      "hygiène des aliments",
      "laver les ustensiles",
    ],
  },
  {
    id: "conditionnement-emballage",
    libelle: "Conditionnement et emballage",
    domaine: "agroalimentaire",
    synonymes: ["emballer les produits", "étiquetage", "mettre en sachets", "conditionnement"],
  },
  {
    id: "vente-nourriture",
    libelle: "Vente de nourriture préparée",
    domaine: "agroalimentaire",
    synonymes: [
      "je vends de la bouillie",
      "vente de nourriture",
      "nourriture au bord de la route",
      "cantine",
    ],
  },

  // Beauté
  {
    id: "coiffure-tresses",
    libelle: "Coiffure et tresses",
    domaine: "beaute",
    synonymes: [
      "je tresse les cheveux",
      "tresses africaines",
      "coiffeuse",
      "poser des mèches",
      "défrisage",
    ],
  },
  {
    id: "coiffure-homme",
    libelle: "Coupe homme et barbier",
    domaine: "beaute",
    synonymes: ["je coupe les cheveux", "barbier", "tondeuse", "coiffeur homme"],
  },
  {
    id: "esthetique-soins",
    libelle: "Esthétique et soins",
    domaine: "beaute",
    synonymes: ["manucure", "pédicure", "maquillage", "soins du visage", "pose d'ongles"],
  },
  {
    id: "savonnerie-cosmetique",
    libelle: "Fabrication de savon et de cosmétiques",
    domaine: "beaute",
    synonymes: ["fabriquer du savon", "savon artisanal", "pommade", "crèmes pour la peau"],
  },

  // Agriculture
  {
    id: "maraichage",
    libelle: "Maraîchage",
    domaine: "agriculture",
    synonymes: [
      "cultiver des légumes",
      "jardin potager",
      "tomates et piments",
      "arrosage des planches",
      "maraîcher",
    ],
  },
  {
    id: "aviculture",
    libelle: "Aviculture",
    domaine: "agriculture",
    synonymes: ["élever des poulets", "poulailler", "poules pondeuses", "poussins"],
  },
  {
    id: "elevage-petit-betail",
    libelle: "Élevage de petit bétail",
    domaine: "agriculture",
    synonymes: ["élever des chèvres", "moutons", "porcherie", "élevage de lapins", "aulacodes"],
  },
  {
    id: "cultures-vivrieres",
    libelle: "Cultures vivrières",
    domaine: "agriculture",
    synonymes: [
      "travailler au champ",
      "cultiver le maïs",
      "igname",
      "labourer la terre",
      "récolte",
    ],
  },
  {
    id: "pisciculture",
    libelle: "Pisciculture",
    domaine: "agriculture",
    synonymes: ["élever des poissons", "étang de poissons", "tilapia", "silures"],
  },

  // Gestion
  {
    id: "comptabilite",
    libelle: "Comptabilité",
    domaine: "gestion",
    synonymes: ["tenir les comptes", "comptable", "bilan comptable", "écritures comptables"],
  },
  {
    id: "gestion-petite-activite",
    libelle: "Gestion d'une petite activité",
    domaine: "gestion",
    synonymes: [
      "gérer mon petit commerce",
      "calculer le bénéfice",
      "noter les dépenses",
      "cahier des ventes",
    ],
  },
  {
    id: "secretariat-accueil",
    libelle: "Secrétariat et accueil",
    domaine: "gestion",
    synonymes: [
      "secrétaire",
      "répondre au téléphone",
      "accueillir les visiteurs",
      "classer les dossiers",
    ],
  },
  {
    id: "calcul",
    libelle: "Calcul",
    domaine: "gestion",
    synonymes: ["je calcule vite", "faire les calculs", "mathématiques", "pourcentages"],
  },
  {
    id: "logistique-livraison",
    libelle: "Livraison et logistique",
    domaine: "gestion",
    synonymes: ["livrer des colis", "livreur", "coursier", "livraison à moto"],
  },
  {
    id: "epargne-tontine",
    libelle: "Épargne et tontine",
    domaine: "gestion",
    synonymes: ["tontine", "épargne", "gérer une tontine", "cotisation"],
  },
  {
    id: "redaction-documents",
    libelle: "Rédaction de documents",
    domaine: "gestion",
    synonymes: ["rédiger des lettres", "écrire des courriers", "rapports écrits", "comptes rendus"],
  },

  // Langues
  {
    id: "parler-langues-locales",
    libelle: "Parler les langues locales",
    domaine: "transversal",
    synonymes: [
      "parler fongbe",
      "parler mina ou éwé",
      "parler yoruba",
      "parler kabiyè",
      "langues nationales",
      "parler bariba ou dendi",
    ],
  },
  {
    id: "parler-francais",
    libelle: "Parler et écrire le français",
    domaine: "transversal",
    synonymes: ["lire et écrire en français", "bon français", "rédiger en français"],
  },
  {
    id: "parler-anglais",
    libelle: "Parler anglais",
    domaine: "transversal",
    synonymes: ["je parle anglais", "anglais", "english"],
  },

  // Savoir-être
  {
    id: "travail-equipe",
    libelle: "Travail en équipe",
    domaine: "transversal",
    synonymes: ["travailler en groupe", "esprit d'équipe", "collaborer avec les collègues"],
  },
  {
    id: "ponctualite-serieux",
    libelle: "Ponctualité et sérieux",
    domaine: "transversal",
    synonymes: [
      "je suis ponctuel",
      "arriver à l'heure",
      "sérieux au travail",
      "respecter les délais",
    ],
  },
  {
    id: "communication-orale",
    libelle: "Communication orale",
    domaine: "transversal",
    synonymes: ["parler en public", "bien expliquer", "convaincre les gens", "prise de parole"],
  },
  {
    id: "resolution-problemes",
    libelle: "Résolution de problèmes",
    domaine: "transversal",
    synonymes: ["trouver des solutions", "débrouillard", "dépanner les gens", "débrouillarde"],
  },
  {
    id: "organisation-travail",
    libelle: "Organisation du travail",
    domaine: "transversal",
    synonymes: ["organiser mon travail", "planifier", "gérer mon temps", "programme de la journée"],
  },
  {
    id: "envie-apprendre",
    libelle: "Envie d'apprendre",
    domaine: "transversal",
    synonymes: ["j'apprends vite", "curieux", "curieuse", "apprendre de nouvelles choses"],
  },
  {
    id: "securite-travail",
    libelle: "Sécurité au travail",
    domaine: "transversal",
    synonymes: [
      "équipements de protection",
      "gants et casque",
      "prévention des accidents",
      "premiers secours",
    ],
  },

  // Aide familiale et services
  {
    id: "garde-enfants",
    libelle: "Garde d'enfants",
    domaine: "transversal",
    synonymes: ["je garde les enfants", "nounou", "s'occuper des petits frères", "baby-sitting"],
  },
  {
    id: "entretien-menage",
    libelle: "Entretien et ménage",
    domaine: "transversal",
    synonymes: ["faire le ménage", "nettoyage", "lessive", "repassage"],
  },
  {
    id: "aide-commerce-familial",
    libelle: "Aide au commerce familial",
    domaine: "commerce",
    synonymes: [
      "j'aide ma mère au marché",
      "boutique de mon père",
      "commerce de la famille",
      "aider mes parents à vendre",
    ],
  },
  {
    id: "soins-personnes",
    libelle: "Soins aux personnes",
    domaine: "transversal",
    synonymes: [
      "s'occuper des personnes âgées",
      "aide-soignant",
      "soigner les malades",
      "garde-malade",
    ],
  },
  {
    id: "gardiennage",
    libelle: "Gardiennage",
    domaine: "transversal",
    synonymes: ["gardien", "vigile", "surveiller les locaux", "gardien de nuit"],
  },

  // Études
  {
    id: "etudes-secondaires",
    libelle: "Études secondaires",
    domaine: "transversal",
    synonymes: ["j'ai fait le lycée", "bepc", "baccalauréat", "collège"],
  },
  {
    id: "etudes-superieures",
    libelle: "Études supérieures",
    domaine: "transversal",
    synonymes: ["licence", "université", "étudiant", "étudiante", "diplôme de bts"],
  },
  {
    id: "etudes-techniques",
    libelle: "Études techniques et professionnelles",
    domaine: "transversal",
    synonymes: ["lycée technique", "enseignement technique", "cap", "brevet de technicien"],
  },
];

// Modèles d'étapes : 3 étapes pour chaque couple (métier, voie), générés à partir de
// gabarits par pays, par voie et par famille de métier. Les titres commencent par un
// verbe (tutoiement) et restent sous 8 mots ; les détails n'inventent aucun contact,
// prix ni durée.
import type { Voie } from "../../src/index";
import { FORMATIONS } from "./formations";
import type { FamilleMetier, MetierSeed } from "./metiers";
import { PROGRAMMES } from "./programmes";
import { SOURCES } from "./sources";

export interface ModeleEtapeSeed {
  metierId: string;
  voie: Voie;
  ordre: 1 | 2 | 3;
  titre: string;
  details: string;
  delaiJours: number;
  programmeId: string | null;
  formationId: string | null;
  sourceUrl: string;
}

interface Gabarit {
  titre: string;
  details: string;
  programmeId?: string;
  formationId?: string;
  /** Source propre à l'étape, quand elle ne vient ni d'un programme ni d'une formation. */
  sourceUrl?: string;
}

export const VOIES: Voie[] = ["EMPLOI", "FORMATION_CERTIFICATION", "AUTO_EMPLOI"];

const DELAIS: Record<Voie, [number, number, number]> = {
  EMPLOI: [7, 21, 45],
  FORMATION_CERTIFICATION: [14, 30, 60],
  AUTO_EMPLOI: [7, 21, 45],
};

const CONTACT = "Contact : À vérifier par le curateur.";
const PAS_DE_FRAIS = "Ne paie jamais pour postuler : une offre payante est une arnaque.";

// ---------------------------------------------------------------------------
// Bénin
// ---------------------------------------------------------------------------

function gabaritsBenin(voie: Voie, famille: FamilleMetier, f: string): [Gabarit, Gabarit, Gabarit] {
  switch (voie) {
    case "EMPLOI":
      return [
        famille === "diplome"
          ? {
              titre: "Vérifie ton éligibilité au programme Azôli",
              details:
                "Azôli vise les jeunes de 18 à 30 ans peu ou pas instruits. Si tu as un diplôme, demande à l'AnpE d'autres pistes.",
              programmeId: "bj-azoli",
            }
          : {
              titre: "Inscris-toi sur la plateforme Azôli",
              details:
                "Azôli vise les jeunes de 18 à 30 ans peu ou pas instruits. Inscris-toi sur sica.anpe.bj.",
              programmeId: "bj-azoli",
            },
        {
          titre: `Prépare un CV simple ${f}`,
          details:
            "Note tes expériences, même informelles ou en famille. Ajoute les ateliers et les lieux où tu as travaillé.",
        },
        famille === "diplome"
          ? { titre: `Postule à trois offres ${f}`, details: PAS_DE_FRAIS }
          : {
              titre: `Démarche trois employeurs ${f}`,
              details: `Présente-toi avec ton CV dans les ateliers et entreprises proches. ${PAS_DE_FRAIS}`,
            },
      ];
    case "FORMATION_CERTIFICATION":
      if (famille === "artisanat") {
        return [
          {
            titre: `Trouve un maître artisan ${f}`,
            details:
              "Choisis un atelier sérieux près de chez toi. Demande les conditions d'apprentissage avant de commencer.",
            formationId: "bj-apprentissage-cqm",
          },
          {
            titre: "Renseigne-toi sur la formation duale CQP",
            details: `L'accès au CQP passe par un test national de formation duale. ${CONTACT}`,
            programmeId: "bj-cqp",
          },
          {
            titre: "Prépare l'examen du CQM",
            details:
              "Le CQM reconnaît officiellement les compétences des apprentis et artisans. Conditions d'inscription : à vérifier par le curateur.",
            programmeId: "bj-cqm",
          },
        ];
      }
      return [
        {
          titre: `Liste trois centres de formation ${f}`,
          details:
            "Demande à chaque centre s'il est reconnu par l'État. Compare le programme et le coût annoncé.",
        },
        {
          titre: "Vérifie l'agrément du centre choisi",
          details: `Demande les documents officiels du centre avant de payer. ${CONTACT}`,
        },
        {
          titre: `Inscris-toi à une formation ${f}`,
          details:
            "Ne verse jamais d'argent sans reçu officiel. Garde une copie de chaque document signé.",
        },
      ];
    case "AUTO_EMPLOI":
      return [
        {
          titre: "Vérifie ton éligibilité au volet auto-emploi Azôli",
          details:
            "Azôli vise les jeunes de 18 à 30 ans peu ou pas instruits. L'inscription se fait sur sica.anpe.bj.",
          programmeId: "bj-azoli",
        },
        {
          titre: `Liste le matériel nécessaire ${f}`,
          details:
            "Note chaque outil et son prix au marché. Commence petit, avec le matériel essentiel.",
        },
        {
          titre: `Trouve tes premiers clients ${f}`,
          details:
            "Parle de ton activité à ton entourage et dans ton quartier. Note chaque vente dans un cahier.",
        },
      ];
  }
}

// ---------------------------------------------------------------------------
// Togo
// ---------------------------------------------------------------------------

function gabaritsTogo(voie: Voie, famille: FamilleMetier, f: string): [Gabarit, Gabarit, Gabarit] {
  switch (voie) {
    case "EMPLOI":
      if (famille === "diplome") {
        return [
          {
            titre: "Inscris-toi sur le portail de l'ANPE Togo",
            details:
              "Crée ton profil de demandeur d'emploi sur le portail. Choisis ensuite le programme AIDE dans ton profil.",
            programmeId: "tg-aide",
          },
          {
            titre: "Prépare ton dossier pour le stage AIDE",
            details:
              "AIDE vise les jeunes diplômés de 18 à 40 ans sans emploi. Un conseiller de l'ANPE t'accompagne jusqu'au stage.",
            programmeId: "tg-aide",
          },
          { titre: `Postule à trois offres ${f}`, details: PAS_DE_FRAIS },
        ];
      }
      return [
        {
          titre: "Inscris-toi sur le portail de l'ANPE Togo",
          details: `Crée ton profil de demandeur d'emploi et consulte les offres publiées. ${CONTACT}`,
          sourceUrl: SOURCES.tgAnpe,
        },
        {
          titre: "Renseigne-toi sur le volontariat de l'ANVT",
          details:
            "L'engagement citoyen vise les 18 à 35 ans sans activité. Il faut un niveau inférieur ou égal à la Terminale.",
          programmeId: "tg-anvt",
        },
        {
          titre: `Démarche trois employeurs ${f}`,
          details: `Présente-toi avec ton CV dans les ateliers et entreprises proches. ${PAS_DE_FRAIS}`,
        },
      ];
    case "FORMATION_CERTIFICATION": {
      const atelier: Gabarit = {
        titre: "Participe à un atelier de l'ANPE Togo",
        details:
          "L'ANPE propose des ateliers sur le CV, l'entretien et le savoir-être. Demande le calendrier à ton agence.",
        formationId: "tg-ateliers-anpe",
      };
      if (famille === "artisanat") {
        return [
          atelier,
          {
            titre: `Trouve un maître artisan ${f}`,
            details:
              "Choisis un atelier sérieux près de chez toi. Demande les conditions d'apprentissage avant de commencer.",
          },
          {
            titre: "Renseigne-toi sur le certificat de fin d'apprentissage",
            details: `Demande au maître artisan quel certificat tu pourras obtenir. ${CONTACT}`,
          },
        ];
      }
      return [
        atelier,
        {
          titre: `Liste trois centres de formation ${f}`,
          details:
            "Demande à chaque centre s'il est reconnu par l'État. Compare le programme et le coût annoncé.",
        },
        {
          titre: "Vérifie l'agrément du centre avant de payer",
          details: `Ne verse jamais d'argent sans reçu officiel. ${CONTACT}`,
        },
      ];
    }
    case "AUTO_EMPLOI":
      return [
        {
          titre: "Prends rendez-vous avec un conseiller ANPE",
          details:
            "Un conseiller t'aide à transformer ton idée en projet. Apporte une courte description de ton idée.",
          sourceUrl: SOURCES.tgEntrepreneuriat,
          formationId: famille === "diplome" ? undefined : "tg-accompagnement-creation",
        },
        {
          titre: `Liste le matériel nécessaire ${f}`,
          details:
            "Note chaque outil et son prix au marché. Commence petit, avec le matériel essentiel.",
        },
        {
          titre: `Trouve tes premiers clients ${f}`,
          details:
            "Parle de ton activité à ton entourage et dans ton quartier. Note chaque vente dans un cahier.",
        },
      ];
  }
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

const SOURCE_PROGRAMME = new Map(PROGRAMMES.map((p) => [p.id, p.sourceUrl]));
const SOURCE_FORMATION = new Map(FORMATIONS.map((f) => [f.id, f.sourceUrl]));

/** Source d'une étape : programme lié, sinon formation liée, sinon fiche métier. */
function sourceEtape(g: Gabarit, metier: MetierSeed): string {
  if (g.sourceUrl) return g.sourceUrl;
  if (g.programmeId) return SOURCE_PROGRAMME.get(g.programmeId) ?? metier.sourceUrl;
  if (g.formationId) return SOURCE_FORMATION.get(g.formationId) ?? metier.sourceUrl;
  return metier.sourceUrl;
}

export function genererModeles(metiers: MetierSeed[]): ModeleEtapeSeed[] {
  const modeles: ModeleEtapeSeed[] = [];
  for (const metier of metiers) {
    for (const voie of VOIES) {
      const gabarits =
        metier.pays === "BJ"
          ? gabaritsBenin(voie, metier.famille, metier.fragment)
          : gabaritsTogo(voie, metier.famille, metier.fragment);
      gabarits.forEach((g, index) => {
        modeles.push({
          metierId: metier.id,
          voie,
          ordre: (index + 1) as 1 | 2 | 3,
          titre: g.titre,
          details: g.details,
          delaiJours: DELAIS[voie][index] ?? 0,
          programmeId: g.programmeId ?? null,
          formationId: g.formationId ?? null,
          sourceUrl: sourceEtape(g, metier),
        });
      });
    }
  }
  return modeles;
}

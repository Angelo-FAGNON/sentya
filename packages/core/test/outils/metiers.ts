// Jeu de métiers en mémoire pour les tests unitaires (aucune base).
import type { MetierSource } from "../../src/orientation/preselection";

export function metier(
  id: string,
  competences: [string, number][],
  voies: MetierSource["voiesDisponibles"] = ["EMPLOI", "FORMATION_CERTIFICATION", "AUTO_EMPLOI"],
): MetierSource {
  return {
    id,
    libelle: `Métier ${id}`,
    description: `Description de ${id}.`,
    sourceUrl: "https://sica.anpe.bj",
    verifieLe: null,
    statut: "A_VERIFIER",
    competences: competences.map(([competenceId, poids]) => ({ competenceId, poids })),
    voiesDisponibles: voies,
    premieresEtapes: Object.fromEntries(voies.map((v) => [v, `Première étape ${v}`])),
  };
}

export const METIERS_TEST: MetierSource[] = [
  metier("bj-couture", [
    ["couture", 3],
    ["retouche", 2],
    ["vente", 1],
  ]),
  metier("bj-vente", [
    ["vente", 3],
    ["negociation", 2],
    ["calcul", 1],
  ]),
  metier("bj-coiffure", [
    ["coiffure", 3],
    ["accueil-client", 1],
  ]),
  metier("bj-mecanique-moto", [
    ["mecanique-moto", 3],
    ["diagnostic", 2],
  ]),
  metier(
    "bj-web",
    [
      ["informatique", 3],
      ["html", 3],
    ],
    ["EMPLOI", "FORMATION_CERTIFICATION"],
  ),
  metier("bj-sans-modele", [["couture", 3]], []),
];

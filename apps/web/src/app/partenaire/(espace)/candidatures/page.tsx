// Candidatures reçues (RG-07) : uniquement sur les opportunités de ce partenaire,
// avec le strict nécessaire du profil, partagé avec l'accord explicite du jeune.
import { candidaturesDuPartenaire, formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { Vide } from "@/composants/admin";
import { exigerPartenaire } from "@/lib/garde";

export const metadata: Metadata = { title: "Candidatures reçues" };

const NIVEAUX: Record<string, string> = {
  AUCUN_DIPLOME: "Aucun diplôme",
  PRIMAIRE: "Primaire",
  SECONDAIRE: "Secondaire",
  BAC: "Bac",
  CERTIFICAT_PRO: "Certificat professionnel",
  SUPERIEUR: "Supérieur",
  AUTRE: "Autre",
};

const STATUTS: Record<string, string> = {
  ENVOYEE: "Envoyée",
  VUE: "Vue",
  RETENUE: "Retenue",
  NON_RETENUE: "Non retenue",
};

export default async function Candidatures() {
  const { partenaire } = await exigerPartenaire({ valide: true });
  const candidatures = await candidaturesDuPartenaire(getPrisma(), partenaire.id);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Candidatures reçues</h1>
      <p className="mb-6">
        Chaque jeune a donné son accord pour partager ces informations avec toi, pour cette offre
        seulement.
      </p>
      {candidatures.length === 0 ? (
        <Vide>Aucune candidature pour l&apos;instant.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">Candidatures reçues sur tes opportunités</caption>
            <thead>
              <tr>
                <th scope="col">Opportunité</th>
                <th scope="col">Prénom</th>
                <th scope="col">Ville</th>
                <th scope="col">Niveau d&apos;études</th>
                <th scope="col">Compétences</th>
                <th scope="col">Accord le</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {candidatures.map((c) => (
                <tr key={c.id}>
                  <td>{c.opportunite.titre}</td>
                  <td>{c.profil.prenom ?? "Non communiqué"}</td>
                  <td>{c.profil.ville ?? "Non communiquée"}</td>
                  <td>
                    {c.profil.niveauEtudes ? NIVEAUX[c.profil.niveauEtudes] : "Non communiqué"}
                  </td>
                  <td>{c.profil.competences.join(", ") || "Aucune"}</td>
                  <td>{formaterDate(c.consentAt)}</td>
                  <td>{STATUTS[c.statut] ?? c.statut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

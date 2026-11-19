import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { Champ, Formulaire, Liste, ZoneTexte } from "@/composants/formulaire";
import { exigerPartenaire } from "@/lib/garde";
import { LIBELLE_PAYS } from "@/lib/valeurs";
import { publierOpportunite } from "../../../actions";

export const metadata: Metadata = { title: "Publier une opportunité" };

export default async function NouvelleOpportunitePartenaire() {
  const { partenaire } = await exigerPartenaire({ valide: true });
  const metiers = await getPrisma().metier.findMany({
    where: { pays: partenaire.pays, statut: { in: ["VERIFIEE", "A_VERIFIER"] } },
    select: { id: true, libelle: true },
    orderBy: { libelle: "asc" },
  });

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Publier une opportunité</h1>
      <p className="mb-2">
        Pays : {LIBELLE_PAYS[partenaire.pays]}. L&apos;offre sera vérifiée par un curateur avant
        d&apos;être proposée aux jeunes.
      </p>
      <p className="mb-6 font-semibold">
        Une offre qui demande de l&apos;argent au candidat (frais de dossier, de formation ou
        d&apos;entretien) est refusée.
      </p>
      <div className="max-w-2xl">
        <Formulaire action={publierOpportunite} libelleBouton="Publier l'opportunité">
          <Champ nom="titre" libelle="Titre" requis aide="Par exemple : Apprenti couturier." />
          <ZoneTexte nom="description" libelle="Description" requis lignes={6} />
          <Champ nom="lieu" libelle="Lieu" requis />
          <Champ nom="contact" libelle="Contact pour candidater" requis />
          <Champ
            nom="sourceUrl"
            libelle="Page de l'offre sur ton site"
            type="url"
            requis
            aide="Adresse complète qui commence par https://."
          />
          <Liste
            nom="metierId"
            libelle="Métier concerné"
            optionVide="Aucun ou je ne sais pas"
            options={metiers.map((m) => ({ valeur: m.id, libelle: m.libelle }))}
          />
          <Champ nom="dateLimite" libelle="Date limite de candidature" type="date" />
        </Formulaire>
      </div>
    </>
  );
}

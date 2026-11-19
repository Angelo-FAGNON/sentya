import { getPrisma, type Opportunite } from "@sentya/db";
import { ChampsFiche } from "@/composants/fiche";
import { Champ, Formulaire, Liste, ZoneTexte } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";
import { versChampDate } from "@/lib/fiche";
import { LIBELLE_PAYS, LIBELLE_STATUT, STATUTS } from "@/lib/valeurs";

export async function FormulaireOpportunite({
  action,
  opportunite,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  opportunite?: Opportunite;
}) {
  const prisma = getPrisma();
  const [metiers, partenaires] = await Promise.all([
    prisma.metier.findMany({
      where: { statut: { notIn: ["BROUILLON"] } },
      select: { id: true, libelle: true, pays: true },
      orderBy: [{ pays: "asc" }, { libelle: "asc" }],
    }),
    prisma.partenaire.findMany({
      where: { statutValidation: "VALIDE" },
      select: { id: true, nom: true, pays: true },
      orderBy: { nom: "asc" },
    }),
  ]);
  return (
    <Formulaire
      action={action}
      libelleBouton={opportunite ? "Enregistrer" : "Soumettre l'opportunité"}
    >
      <Champ nom="titre" libelle="Titre" valeur={opportunite?.titre} requis />
      <ZoneTexte nom="description" libelle="Description" valeur={opportunite?.description} requis />
      <Champ nom="lieu" libelle="Lieu" valeur={opportunite?.lieu} requis />
      <Champ nom="contact" libelle="Contact" valeur={opportunite?.contact} requis />
      <Liste
        nom="metierId"
        libelle="Métier"
        valeur={opportunite?.metierId}
        optionVide="Aucun"
        options={metiers.map((m) => ({
          valeur: m.id,
          libelle: `${m.libelle} (${LIBELLE_PAYS[m.pays]})`,
        }))}
        aide="Le métier doit être du même pays que l'offre."
      />
      <Liste
        nom="partenaireId"
        libelle="Partenaire"
        valeur={opportunite?.partenaireId}
        optionVide="Aucun (offre repérée par un curateur)"
        options={partenaires.map((p) => ({
          valeur: p.id,
          libelle: `${p.nom} (${LIBELLE_PAYS[p.pays]})`,
        }))}
      />
      <Champ
        nom="dateLimite"
        libelle="Date limite de candidature"
        type="date"
        valeur={versChampDate(opportunite?.dateLimite)}
      />
      <ChampsFiche
        valeurs={opportunite ?? { statut: "BROUILLON" }}
        avecDate={false}
        statuts={STATUTS.map((s) => ({ valeur: s, libelle: LIBELLE_STATUT[s] }))}
      />
      <p className="text-sm">
        La date de vérification est posée automatiquement quand l&apos;offre passe au statut
        Vérifiée, après une nouvelle analyse de fraude.
      </p>
    </Formulaire>
  );
}

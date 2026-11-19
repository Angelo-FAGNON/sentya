// Formulaires de la fiche métier : fiche, compétences liées, formations liées.
import type { Metier } from "@sentya/db";
import { ChampsFiche } from "@/composants/fiche";
import { Champ, Formulaire, Groupe, Liste, ZoneTexte } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";

type Action = (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;

export function FormulaireMetier({ action, metier }: { action: Action; metier?: Metier }) {
  return (
    <Formulaire action={action} libelleBouton={metier ? "Enregistrer" : "Créer le métier"}>
      {metier ? (
        <p>
          Identifiant : <code className="font-mono">{metier.id}</code> (non modifiable).
        </p>
      ) : (
        <Champ
          nom="id"
          libelle="Identifiant"
          requis
          aide="Préfixe du pays, puis le métier. Par exemple : bj-mecanique-moto."
        />
      )}
      <Champ nom="libelle" libelle="Libellé" valeur={metier?.libelle} requis />
      <ZoneTexte nom="description" libelle="Description" valeur={metier?.description} requis />
      <ZoneTexte
        nom="ouExiste"
        libelle="Où ce métier existe"
        valeur={metier?.ouExiste}
        requis
        lignes={2}
        aide="Villes, quartiers ou secteurs du pays."
      />
      <ChampsFiche valeurs={metier} />
    </Formulaire>
  );
}

const OPTIONS_POIDS = [
  { valeur: "1", libelle: "1 : utile" },
  { valeur: "2", libelle: "2 : importante" },
  { valeur: "3", libelle: "3 : essentielle" },
];

export function FormulaireCompetencesMetier({
  action,
  liens,
  competences,
}: {
  action: Action;
  liens: { competenceId: string; libelle: string; poids: number }[];
  competences: { id: string; libelle: string }[];
}) {
  const disponibles = competences
    .filter((c) => !liens.some((l) => l.competenceId === c.id))
    .map((c) => ({ valeur: c.id, libelle: c.libelle }));
  return (
    <Formulaire action={action} libelleBouton="Enregistrer les compétences">
      {liens.length === 0 ? <p>Aucune compétence liée pour l&apos;instant.</p> : null}
      {liens.map((lien) => (
        <Liste
          key={lien.competenceId}
          nom={`poids:${lien.competenceId}`}
          libelle={lien.libelle}
          options={[{ valeur: "0", libelle: "Retirer ce lien" }, ...OPTIONS_POIDS]}
          valeur={String(lien.poids)}
        />
      ))}
      <fieldset className="space-y-3 rounded border border-slate-300 p-4">
        <legend className="px-1 font-bold">Ajouter des compétences</legend>
        {[1, 2, 3].map((n) => (
          <div key={n} className="grid gap-3 sm:grid-cols-2">
            <Liste
              nom={`ajout-competence-${n}`}
              libelle={`Compétence à ajouter ${n}`}
              options={disponibles}
              optionVide="Aucune"
            />
            <Liste
              nom={`ajout-poids-${n}`}
              libelle={`Poids ${n}`}
              options={OPTIONS_POIDS}
              valeur="2"
            />
          </div>
        ))}
      </fieldset>
    </Formulaire>
  );
}

export function FormulaireFormationsMetier({
  action,
  formations,
  liees,
}: {
  action: Action;
  formations: { id: string; intitule: string; organisme: string }[];
  liees: string[];
}) {
  if (formations.length === 0) {
    return <p>Aucune formation dans ce pays. Crée d&apos;abord une formation.</p>;
  }
  return (
    <Formulaire action={action} libelleBouton="Enregistrer les formations">
      <Groupe
        nom="formations"
        legende="Formations qui mènent à ce métier"
        options={formations.map((f) => ({
          valeur: f.id,
          libelle: `${f.intitule} (${f.organisme})`,
        }))}
        valeurs={liees}
      />
    </Formulaire>
  );
}

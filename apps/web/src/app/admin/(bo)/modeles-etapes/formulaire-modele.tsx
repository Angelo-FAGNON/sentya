import { getPrisma, type ModeleEtape } from "@sentya/db";
import { ChampsFiche } from "@/composants/fiche";
import { Champ, Formulaire, Liste, ZoneTexte } from "@/composants/formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";
import { LIBELLE_PAYS, LIBELLE_VOIE, VOIES } from "@/lib/valeurs";

/** Formulaire d'une étape type. Le pays est celui du métier choisi. */
export async function FormulaireModele({
  action,
  modele,
  metierParDefaut,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  modele?: ModeleEtape;
  metierParDefaut?: string;
}) {
  const prisma = getPrisma();
  const [metiers, programmes, formations] = await Promise.all([
    prisma.metier.findMany({
      select: { id: true, libelle: true, pays: true },
      orderBy: [{ pays: "asc" }, { libelle: "asc" }],
    }),
    prisma.programme.findMany({
      select: { id: true, nom: true, pays: true },
      orderBy: [{ pays: "asc" }, { nom: "asc" }],
    }),
    prisma.formation.findMany({
      select: { id: true, intitule: true, pays: true },
      orderBy: [{ pays: "asc" }, { intitule: "asc" }],
    }),
  ]);
  return (
    <Formulaire action={action} libelleBouton={modele ? "Enregistrer" : "Créer l'étape type"}>
      <Liste
        nom="metierId"
        libelle="Métier"
        requis
        valeur={modele?.metierId ?? metierParDefaut}
        options={metiers.map((m) => ({
          valeur: m.id,
          libelle: `${m.libelle} (${LIBELLE_PAYS[m.pays]})`,
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Liste
          nom="voie"
          libelle="Voie"
          requis
          valeur={modele?.voie ?? "EMPLOI"}
          options={VOIES.map((v) => ({ valeur: v, libelle: LIBELLE_VOIE[v] }))}
        />
        <Liste
          nom="ordre"
          libelle="Position dans le plan"
          requis
          valeur={String(modele?.ordre ?? 1)}
          options={[1, 2, 3].map((n) => ({ valeur: String(n), libelle: `Étape ${n}` }))}
        />
      </div>
      <Champ nom="titre" libelle="Titre de l'étape" valeur={modele?.titre} requis />
      <ZoneTexte nom="details" libelle="Détails" valeur={modele?.details} requis />
      <Champ
        nom="delaiJours"
        libelle="Échéance, en jours après la création du plan"
        type="number"
        min={0}
        max={365}
        valeur={modele?.delaiJours ?? 7}
        requis
      />
      <Liste
        nom="programmeId"
        libelle="Programme associé"
        valeur={modele?.programmeId}
        optionVide="Aucun"
        options={programmes.map((p) => ({
          valeur: p.id,
          libelle: `${p.nom} (${LIBELLE_PAYS[p.pays]})`,
        }))}
      />
      <Liste
        nom="formationId"
        libelle="Formation associée"
        valeur={modele?.formationId}
        optionVide="Aucune"
        options={formations.map((f) => ({
          valeur: f.id,
          libelle: `${f.intitule} (${LIBELLE_PAYS[f.pays]})`,
        }))}
      />
      <ChampsFiche valeurs={modele} avecPays={false} />
    </Formulaire>
  );
}

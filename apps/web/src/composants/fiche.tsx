// Champs communs à toute fiche du référentiel : pays, source, date de vérification, statut.
import type { Pays, Statut } from "@sentya/db";
import { versChampDate } from "@/lib/fiche";
import { LIBELLE_PAYS, LIBELLE_STATUT, PAYS, STATUTS } from "@/lib/valeurs";
import { BoutonAction, CaseACocher, Champ, Liste } from "./formulaire";
import type { EtatFormulaire } from "@/lib/etat-formulaire";

const OPTIONS_PAYS = PAYS.map((p) => ({ valeur: p, libelle: LIBELLE_PAYS[p] }));
const OPTIONS_STATUT = STATUTS.map((s) => ({ valeur: s, libelle: LIBELLE_STATUT[s] }));

export function ChampsFiche({
  valeurs,
  avecPays = true,
  statuts = OPTIONS_STATUT,
  avecDate = true,
}: {
  valeurs?: { pays?: Pays; sourceUrl?: string; verifieLe?: Date | null; statut?: Statut };
  avecPays?: boolean;
  statuts?: { valeur: string; libelle: string }[];
  avecDate?: boolean;
}) {
  return (
    <fieldset className="space-y-4 rounded border border-slate-300 p-4">
      <legend className="px-1 font-bold">Source et vérification</legend>
      {avecPays ? (
        <Liste
          nom="pays"
          libelle="Pays"
          options={OPTIONS_PAYS}
          valeur={valeurs?.pays ?? "BJ"}
          requis
        />
      ) : null}
      <Champ
        nom="sourceUrl"
        libelle="Source (adresse web)"
        type="url"
        valeur={valeurs?.sourceUrl}
        requis
        aide="Page officielle où l'information a été vérifiée. Commence par https://."
      />
      {avecDate ? (
        <Champ
          nom="verifieLe"
          libelle="Date de vérification"
          type="date"
          valeur={versChampDate(valeurs?.verifieLe)}
        />
      ) : null}
      <Liste
        nom="statut"
        libelle="Statut"
        options={statuts}
        valeur={valeurs?.statut ?? "A_VERIFIER"}
        requis
      />
      <CaseACocher
        nom="verifieeAujourdhui"
        libelle="Je viens de vérifier cette fiche à la source"
        aide="Passe la fiche au statut Vérifiée, avec la date du jour."
      />
    </fieldset>
  );
}

/** Suppression avec confirmation explicite, sans JavaScript (élément details). */
export function ZoneSuppression({
  action,
  avertissement,
}: {
  action: (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;
  avertissement: string;
}) {
  return (
    <details className="mt-10 rounded border border-red-300 p-4">
      <summary className="cursor-pointer font-semibold text-red-800">Supprimer cette fiche</summary>
      <p className="my-3">{avertissement}</p>
      <BoutonAction
        action={action}
        libelle="Oui, supprimer définitivement"
        variante="bouton-danger"
      />
    </details>
  );
}

"use client";
// Bouton « Voir mon plan » puis affichage du plan. Fonctionne aussi sans JavaScript :
// le formulaire est alors envoyé normalement et la page revient avec le plan.
import { useActionState } from "react";
import { monPlan } from "@/lib/textes-publics";
import { consulterPlan } from "./actions";
import type { EtatPlan } from "./etat";

export function VoirPlan({ jeton, valide }: { jeton: string; valide: boolean }) {
  const [etat, executer, enCours] = useActionState(consulterPlan, {
    statut: "initial",
  } as EtatPlan);

  if (etat.statut === "expire" || (etat.statut === "initial" && !valide)) {
    return (
      <p role="alert" className="mt-6 rounded border-l-4 border-amber-700 bg-amber-50 p-4 text-lg">
        {monPlan.expire}
      </p>
    );
  }
  if (etat.statut === "sans_plan") {
    return (
      <p role="status" className="mt-6 rounded bg-slate-50 p-4 text-lg">
        {monPlan.sansPlan}
      </p>
    );
  }
  if (etat.statut === "plan") {
    return (
      <section aria-labelledby="titre-plan" className="mt-6">
        <h2 id="titre-plan" className="text-2xl font-bold">
          {etat.metier}
        </h2>
        <p className="mt-1">Voie : {etat.voie}</p>
        <ol className="mt-6 space-y-6">
          {etat.etapes.map((etape) => (
            <li key={etape.ordre} className="rounded border border-slate-300 p-4">
              <h3 className="text-xl font-semibold">
                Étape {etape.ordre} : {etape.titre}
              </h3>
              <p className="mt-2 whitespace-pre-line">{etape.details}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-semibold">À faire avant le</dt>
                <dd>{etape.echeance}</dd>
                <dt className="font-semibold">Statut</dt>
                <dd>{etape.statut}</dd>
              </dl>
              <p className="mt-2 text-sm text-slate-700">{etape.source}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6">{monPlan.rappel}</p>
      </section>
    );
  }
  return (
    <form action={executer} className="mt-6">
      <p className="mb-4 text-lg">{monPlan.intro}</p>
      <input type="hidden" name="jeton" value={jeton} />
      <button type="submit" className="bouton px-6 py-3 text-lg" disabled={enCours}>
        {enCours ? "Chargement..." : monPlan.bouton}
      </button>
    </form>
  );
}

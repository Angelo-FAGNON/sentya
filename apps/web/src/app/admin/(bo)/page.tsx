// Tableau de bord (EF-12) : indicateurs calculés par le noyau, en tableaux simples.
import { calculerIndicateurs, formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { EnTete } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";

export const metadata: Metadata = { title: "Tableau de bord" };

function pourcentage(valeur: number | null): string {
  return valeur === null ? "Pas encore de données" : `${Math.round(valeur * 1000) / 10} %`;
}

function duree(minutes: number | null): string {
  if (minutes === null) return "Pas encore de données";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min`;
}

function Indicateur({ titre, valeur, aide }: { titre: string; valeur: string; aide: string }) {
  return (
    <div className="rounded border border-slate-300 p-4">
      <dt className="font-semibold">{titre}</dt>
      <dd className="mt-1 text-2xl font-bold">{valeur}</dd>
      <dd className="mt-1 text-sm text-slate-700">{aide}</dd>
    </div>
  );
}

export default async function TableauDeBord() {
  await exigerAdmin("tableau");
  const prisma = getPrisma();
  const maintenant = new Date();
  const indicateurs = await calculerIndicateurs(prisma, maintenant);
  const [aVerifier, enAttente] = await Promise.all([
    Promise.all([
      prisma.metier.count({ where: { statut: "A_VERIFIER" } }),
      prisma.formation.count({ where: { statut: "A_VERIFIER" } }),
      prisma.programme.count({ where: { statut: "A_VERIFIER" } }),
      prisma.opportunite.count({ where: { statut: "A_VERIFIER" } }),
    ]),
    prisma.partenaire.count({ where: { statutValidation: "EN_ATTENTE" } }),
  ]);
  const totalAVerifier = aVerifier.reduce((s, n) => s + n, 0);

  return (
    <>
      <EnTete titre="Tableau de bord" />
      <p className="mb-6">
        Période : du {formaterDate(indicateurs.periode.debut)} au{" "}
        {formaterDate(indicateurs.periode.fin)} (30 derniers jours).
      </p>

      <section aria-labelledby="titre-cle" className="mb-8">
        <h2 id="titre-cle" className="mb-3 text-xl font-semibold">
          Indicateur clé
        </h2>
        <dl>
          <Indicateur
            titre="Étapes réalisées à 30 jours"
            valeur={pourcentage(indicateurs.partEtapesRealisees30j)}
            aide="Part des étapes marquées « Fait » dans les 30 jours, pour les plans créés il y a 30 à 60 jours."
          />
        </dl>
      </section>

      <section aria-labelledby="titre-parcours" className="mb-8">
        <h2 id="titre-parcours" className="mb-3 text-xl font-semibold">
          Parcours des jeunes
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Indicateur
            titre="Bilans terminés"
            valeur={pourcentage(indicateurs.tauxBilansTermines)}
            aide="Bilans terminés sur bilans commencés."
          />
          <Indicateur
            titre="Temps médian jusqu'au plan"
            valeur={duree(indicateurs.tempsMedianJusquauPlanMinutes)}
            aide="Entre la création du profil et le premier plan."
          />
        </dl>
      </section>

      <section aria-labelledby="titre-canaux" className="mb-8">
        <h2 id="titre-canaux" className="mb-3 text-xl font-semibold">
          Nouveaux utilisateurs par canal et source
        </h2>
        {indicateurs.nouveauxUtilisateursParCanal.length === 0 ? (
          <p>Aucun nouvel utilisateur sur la période.</p>
        ) : (
          <table className="tableau max-w-xl">
            <caption className="sr-only">Nouveaux utilisateurs par canal et par source</caption>
            <thead>
              <tr>
                <th scope="col">Canal</th>
                <th scope="col">Source</th>
                <th scope="col" className="text-right">
                  Nombre
                </th>
              </tr>
            </thead>
            <tbody>
              {indicateurs.nouveauxUtilisateursParCanal.map((ligne) => (
                <tr key={`${ligne.canal}-${ligne.source}`}>
                  <td>{ligne.canal}</td>
                  <td>{ligne.source}</td>
                  <td className="text-right">{ligne.nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="titre-qualite" className="mb-8">
        <h2 id="titre-qualite" className="mb-3 text-xl font-semibold">
          Qualité du référentiel et fraude
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Indicateur
            titre="Fiches à jour"
            valeur={pourcentage(indicateurs.partFichesAJour)}
            aide="Fiches vérifiées depuis moins de 6 mois, hors brouillons."
          />
          <Indicateur
            titre="Fiches à vérifier"
            valeur={String(totalAVerifier)}
            aide="Métiers, formations, programmes et opportunités au statut « À vérifier »."
          />
          <Indicateur
            titre="Opportunités signalées"
            valeur={String(indicateurs.opportunitesSignalees)}
            aide="Signalements reçus sur la période."
          />
          <Indicateur
            titre="Opportunités suspendues"
            valeur={String(indicateurs.opportunitesSuspendues)}
            aide="Suspendues aujourd'hui, toutes dates confondues."
          />
          <Indicateur
            titre="Partenaires en attente"
            valeur={String(enAttente)}
            aide="Organisations à valider par un administrateur."
          />
        </dl>
      </section>
    </>
  );
}

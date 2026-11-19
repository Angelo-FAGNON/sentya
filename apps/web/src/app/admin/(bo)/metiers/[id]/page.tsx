import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeStatut,
  DateVerification,
  EnTete,
  LienRetour,
  MessageRetour,
  type ParametresRecherche,
} from "@/composants/admin";
import { ZoneSuppression } from "@/composants/fiche";
import { BoutonAction } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { LIBELLE_PAYS } from "@/lib/valeurs";
import { marquerVerifiee, supprimerFiche } from "../../actions-fiches";
import {
  enregistrerCompetencesMetier,
  enregistrerFormationsMetier,
  modifierMetier,
} from "../actions";
import {
  FormulaireCompetencesMetier,
  FormulaireFormationsMetier,
  FormulaireMetier,
} from "../formulaires-metier";

export const metadata: Metadata = { title: "Modifier un métier" };

export default async function ModifierMetier({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const prisma = getPrisma();
  const metier = await prisma.metier.findUnique({
    where: { id },
    include: {
      competences: { include: { competence: { select: { libelle: true } } } },
      formations: { select: { formationId: true } },
      _count: { select: { modeles: true, pistes: true } },
    },
  });
  if (!metier) notFound();
  const [competences, formations] = await Promise.all([
    prisma.competence.findMany({
      select: { id: true, libelle: true },
      orderBy: { libelle: "asc" },
    }),
    prisma.formation.findMany({
      where: { pays: metier.pays },
      select: { id: true, intitule: true, organisme: true },
      orderBy: { intitule: "asc" },
    }),
  ]);
  const { ok } = await searchParams;

  return (
    <>
      <LienRetour href="/admin/metiers">Retour aux métiers</LienRetour>
      <EnTete titre={`${metier.libelle} (${LIBELLE_PAYS[metier.pays]})`}>
        <BoutonAction
          action={marquerVerifiee.bind(null, "metier", metier.id)}
          libelle="Marquer comme vérifiée aujourd'hui"
          variante="bouton"
        />
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-6">
        Statut : <BadgeStatut statut={metier.statut} />. Vérifiée le :{" "}
        <DateVerification date={metier.verifieLe} />.{" "}
        <Link href={`/admin/modeles-etapes?metier=${metier.id}`}>
          {metier._count.modeles} étape(s) type(s)
        </Link>
        .
      </p>

      <section aria-labelledby="titre-fiche" className="mb-10">
        <h2 id="titre-fiche" className="mb-3 text-xl font-semibold">
          Fiche
        </h2>
        <FormulaireMetier
          key={metier.updatedAt.toISOString()}
          action={modifierMetier.bind(null, metier.id)}
          metier={metier}
        />
      </section>

      <section aria-labelledby="titre-competences" className="mb-10">
        <h2 id="titre-competences" className="mb-3 text-xl font-semibold">
          Compétences liées
        </h2>
        <FormulaireCompetencesMetier
          key={metier.competences.map((l) => `${l.competenceId}:${l.poids}`).join(",")}
          action={enregistrerCompetencesMetier.bind(null, metier.id)}
          liens={metier.competences.map((l) => ({
            competenceId: l.competenceId,
            libelle: l.competence.libelle,
            poids: l.poids,
          }))}
          competences={competences}
        />
      </section>

      <section aria-labelledby="titre-formations" className="mb-10">
        <h2 id="titre-formations" className="mb-3 text-xl font-semibold">
          Formations liées
        </h2>
        <FormulaireFormationsMetier
          key={metier.formations.map((f) => f.formationId).join(",")}
          action={enregistrerFormationsMetier.bind(null, metier.id)}
          formations={formations}
          liees={metier.formations.map((f) => f.formationId)}
        />
      </section>

      <ZoneSuppression
        action={supprimerFiche.bind(null, "metier", metier.id)}
        avertissement={
          metier._count.pistes > 0
            ? `Ce métier a été proposé ${metier._count.pistes} fois : la suppression sera refusée. Passe-le plutôt au statut Suspendue.`
            : "Les liens et les étapes types de ce métier seront supprimés. Cette action est définitive."
        }
      />
    </>
  );
}

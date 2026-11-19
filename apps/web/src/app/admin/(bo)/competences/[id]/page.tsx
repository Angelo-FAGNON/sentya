import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnTete, LienRetour } from "@/composants/admin";
import { ZoneSuppression } from "@/composants/fiche";
import { exigerAdmin } from "@/lib/garde";
import { supprimerFiche } from "../../actions-fiches";
import { modifierCompetence } from "../actions";
import { FormulaireCompetence } from "../formulaire-competence";

export const metadata: Metadata = { title: "Modifier une compétence" };

export default async function ModifierCompetence({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const competence = await getPrisma().competence.findUnique({
    where: { id },
    include: { _count: { select: { metiers: true, utilisateurs: true } } },
  });
  if (!competence) notFound();

  return (
    <>
      <LienRetour href="/admin/competences">Retour aux compétences</LienRetour>
      <EnTete titre={competence.libelle} />
      <p className="mb-6">
        Utilisée par {competence._count.metiers} métier(s) et {competence._count.utilisateurs}{" "}
        profil(s) de jeunes.
      </p>
      <FormulaireCompetence
        action={modifierCompetence.bind(null, competence.id)}
        competence={competence}
      />
      <ZoneSuppression
        action={supprimerFiche.bind(null, "competence", competence.id)}
        avertissement="La compétence sera retirée des métiers et des profils des jeunes. Cette action est définitive."
      />
    </>
  );
}

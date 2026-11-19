import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
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
import { LIBELLE_PAYS, LIBELLE_VOIE } from "@/lib/valeurs";
import { marquerVerifiee, supprimerFiche } from "../../actions-fiches";
import { modifierModeleEtape } from "../actions";
import { FormulaireModele } from "../formulaire-modele";

export const metadata: Metadata = { title: "Modifier une étape type" };

export default async function ModifierModele({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const modele = await getPrisma().modeleEtape.findUnique({
    where: { id },
    include: { metier: { select: { libelle: true, pays: true } } },
  });
  if (!modele) notFound();
  const { ok } = await searchParams;

  return (
    <>
      <LienRetour href={`/admin/modeles-etapes?metier=${modele.metierId}`}>
        Retour aux étapes de ce métier
      </LienRetour>
      <EnTete titre={`Étape ${modele.ordre} : ${modele.titre}`}>
        <BoutonAction
          action={marquerVerifiee.bind(null, "modeleEtape", modele.id)}
          libelle="Marquer comme vérifiée aujourd'hui"
          variante="bouton"
        />
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-6">
        {modele.metier.libelle}, {LIBELLE_PAYS[modele.metier.pays]}, voie{" "}
        {LIBELLE_VOIE[modele.voie]}. Statut : <BadgeStatut statut={modele.statut} />. Vérifiée le :{" "}
        <DateVerification date={modele.verifieLe} />.
      </p>
      <FormulaireModele
        key={modele.updatedAt.toISOString()}
        action={modifierModeleEtape.bind(null, modele.id)}
        modele={modele}
      />
      <ZoneSuppression
        action={supprimerFiche.bind(null, "modeleEtape", modele.id)}
        avertissement="Les plans déjà créés gardent leur copie de l'étape. Cette action est définitive."
      />
    </>
  );
}

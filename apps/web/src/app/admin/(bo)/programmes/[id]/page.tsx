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
import { marquerVerifiee, supprimerFiche } from "../../actions-fiches";
import { modifierProgramme } from "../actions";
import { FormulaireProgramme } from "../formulaire-programme";

export const metadata: Metadata = { title: "Modifier un programme" };

export default async function ModifierProgramme({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: ParametresRecherche;
}) {
  await exigerAdmin("referentiel");
  const { id } = await params;
  const programme = await getPrisma().programme.findUnique({ where: { id } });
  if (!programme) notFound();
  const { ok } = await searchParams;

  return (
    <>
      <LienRetour href="/admin/programmes">Retour aux programmes</LienRetour>
      <EnTete titre={programme.nom}>
        <BoutonAction
          action={marquerVerifiee.bind(null, "programme", programme.id)}
          libelle="Marquer comme vérifiée aujourd'hui"
          variante="bouton"
        />
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-6">
        Statut : <BadgeStatut statut={programme.statut} />. Vérifiée le :{" "}
        <DateVerification date={programme.verifieLe} />.
      </p>
      <FormulaireProgramme action={modifierProgramme.bind(null, programme.id)} programme={programme} />
      <ZoneSuppression
        action={supprimerFiche.bind(null, "programme", programme.id)}
        avertissement="Les plans déjà créés gardent leur copie des informations. Cette action est définitive."
      />
    </>
  );
}

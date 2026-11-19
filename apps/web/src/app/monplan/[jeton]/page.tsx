// Lien magique (EF-11). Le GET ne consomme jamais le jeton : il vérifie seulement sa validité.
// La consommation se fait au clic sur « Voir mon plan » (action serveur, POST).
import { lienMagiqueValide } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { CadrePublic } from "@/composants/cadre-public";
import { monPlan } from "@/lib/textes-publics";
import { VoirPlan } from "./voir-plan";

export const metadata: Metadata = {
  title: monPlan.titre,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function MonPlan({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const formatValide = /^[A-Za-z0-9_-]{20,200}$/.test(jeton);
  const valide = formatValide && (await lienMagiqueValide(getPrisma(), jeton, new Date()));

  // VoirPlan est toujours rendu quand le format est correct : sans JavaScript, la page revient
  // après l'envoi du formulaire avec le plan, alors que le jeton vient d'être consommé.
  return (
    <CadrePublic>
      <h1 className="text-3xl font-bold">{monPlan.titre}</h1>
      {formatValide ? (
        <VoirPlan jeton={jeton} valide={valide} />
      ) : (
        <p
          role="alert"
          className="mt-6 rounded border-l-4 border-amber-700 bg-amber-50 p-4 text-lg"
        >
          {monPlan.expire}
        </p>
      )}
    </CadrePublic>
  );
}

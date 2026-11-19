// Détail d'une conversation pseudonymisée et formulaire de notation.
// Sélection explicite des colonnes : le hachage du jeune (userHash) n'est jamais lu.
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnTete, LienRetour } from "@/composants/admin";
import { Formulaire, Groupe, ZoneTexte } from "@/composants/formulaire";
import { lireConversation } from "@/lib/revue";
import { exigerAdmin } from "@/lib/garde";
import { LIBELLE_PAYS, LIBELLE_VOIE } from "@/lib/valeurs";
import { noter } from "../actions";

export const metadata: Metadata = { title: "Conversation à relire" };

const OUI_NON = [
  { valeur: "oui", libelle: "Oui" },
  { valeur: "non", libelle: "Non" },
];

function versOuiNon(valeur: boolean | null): string[] {
  return valeur === null ? [] : [valeur ? "oui" : "non"];
}

export default async function DetailRevue({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin("revue");
  const { id } = await params;
  const revue = await getPrisma().revueQualite.findUnique({
    where: { id },
    select: {
      id: true,
      semaine: true,
      conversationAnonymisee: true,
      pistesCorrectes: true,
      inventionDetectee: true,
      commentaire: true,
    },
  });
  if (!revue) notFound();
  const conversation = lireConversation(revue.conversationAnonymisee);

  return (
    <>
      <LienRetour href="/admin/revue">Retour à l&apos;échantillon</LienRetour>
      <EnTete titre={`Conversation à relire (semaine ${revue.semaine})`} />
      <p className="mb-6">
        Pays : {conversation.pays ? LIBELLE_PAYS[conversation.pays] : "inconnu"}. Version du prompt
        : {conversation.promptVersion ?? "inconnue"}.
      </p>

      <section aria-labelledby="titre-reponses" className="mb-8">
        <h2 id="titre-reponses" className="mb-3 text-xl font-semibold">
          Réponses du jeune (pseudonymisées)
        </h2>
        {conversation.reponses.length === 0 ? (
          <p>Aucune réponse enregistrée.</p>
        ) : (
          <dl className="space-y-3">
            {conversation.reponses.map((r, index) => (
              <div key={index} className="rounded bg-slate-50 p-3">
                <dt className="font-semibold">{r.question}</dt>
                <dd className="whitespace-pre-line">{r.texte}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="titre-competences" className="mb-8">
        <h2 id="titre-competences" className="mb-3 text-xl font-semibold">
          Compétences retenues
        </h2>
        <p>{conversation.competences.length ? conversation.competences.join(", ") : "Aucune."}</p>
      </section>

      <section aria-labelledby="titre-candidats" className="mb-8">
        <h2 id="titre-candidats" className="mb-3 text-xl font-semibold">
          Métiers candidats présentés à l&apos;IA
        </h2>
        <p>{conversation.candidats.length ? conversation.candidats.join(", ") : "Aucun."}</p>
        {conversation.idsRejetes.length ? (
          <p className="mt-2 text-red-900">
            Identifiants inventés et rejetés : {conversation.idsRejetes.join(", ")}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="titre-pistes" className="mb-8">
        <h2 id="titre-pistes" className="mb-3 text-xl font-semibold">
          Pistes proposées
        </h2>
        <ol className="space-y-3">
          {conversation.pistes.map((p) => (
            <li key={p.rang} className="rounded border border-slate-300 p-3">
              <p className="font-semibold">
                {p.rang}. {p.metier} ({p.voie ? LIBELLE_VOIE[p.voie] : "voie inconnue"})
                {p.aExplorer ? (
                  <span className="ml-2 rounded bg-amber-200 px-2 text-sm text-amber-950">
                    À explorer
                  </span>
                ) : null}
              </p>
              <p>
                <span className="font-semibold">Raison : </span>
                {p.raison}
              </p>
              <p>
                <span className="font-semibold">Condition principale : </span>
                {p.condition}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="titre-note" className="mb-8">
        <h2 id="titre-note" className="mb-3 text-xl font-semibold">
          Ta notation
        </h2>
        <Formulaire action={noter.bind(null, revue.id)} libelleBouton="Enregistrer la notation">
          <Groupe
            nom="pistesCorrectes"
            legende="Les pistes sont-elles correctes ?"
            type="radio"
            requis
            options={OUI_NON}
            valeurs={versOuiNon(revue.pistesCorrectes)}
          />
          <Groupe
            nom="inventionDetectee"
            legende="As-tu détecté une invention de l'IA ?"
            type="radio"
            requis
            options={OUI_NON}
            valeurs={versOuiNon(revue.inventionDetectee)}
          />
          <ZoneTexte
            nom="commentaire"
            libelle="Commentaire"
            valeur={revue.commentaire}
            lignes={3}
          />
        </Formulaire>
      </section>
    </>
  );
}

// Échantillon de la semaine ISO courante. Le hachage du jeune n'est jamais lu ni affiché.
import { formaterDate, semaineIso } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import Link from "next/link";
import { EnTete, MessageRetour, Vide, type ParametresRecherche } from "@/composants/admin";
import { BoutonAction } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { genererEchantillon } from "./actions";

export const metadata: Metadata = { title: "Revue qualité" };

function ouiNon(valeur: boolean | null) {
  return valeur === null ? "" : valeur ? "Oui" : "Non";
}

export default async function Revue({ searchParams }: { searchParams: ParametresRecherche }) {
  await exigerAdmin("revue");
  const { ok } = await searchParams;
  const semaine = semaineIso(new Date());
  const revues = await getPrisma().revueQualite.findMany({
    where: { semaine },
    select: {
      id: true,
      createdAt: true,
      pistesCorrectes: true,
      inventionDetectee: true,
      noteeLe: true,
      relecteur: { select: { email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const notees = revues.filter((r) => r.noteeLe).length;

  return (
    <>
      <EnTete titre={`Revue qualité, semaine ${semaine}`}>
        <BoutonAction
          action={genererEchantillon}
          libelle="Générer l'échantillon de la semaine"
          variante="bouton"
        />
      </EnTete>
      <MessageRetour code={ok} />
      <p className="mb-6">
        {revues.length} conversation(s) dans l&apos;échantillon, {notees} notée(s). Les textes sont
        pseudonymisés.
      </p>
      {revues.length === 0 ? (
        <Vide>Pas encore d&apos;échantillon cette semaine.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">Conversations de l&apos;échantillon de la semaine</caption>
            <thead>
              <tr>
                <th scope="col">Conversation</th>
                <th scope="col">Pistes correctes</th>
                <th scope="col">Invention détectée</th>
                <th scope="col">Notée le</th>
                <th scope="col">Par</th>
              </tr>
            </thead>
            <tbody>
              {revues.map((r, index) => (
                <tr key={r.id} className={r.noteeLe ? "" : "bg-amber-50"}>
                  <td>
                    <Link href={`/admin/revue/${r.id}`}>
                      Conversation {index + 1}
                      {r.noteeLe ? "" : " (à noter)"}
                    </Link>
                  </td>
                  <td>{ouiNon(r.pistesCorrectes)}</td>
                  <td>{ouiNon(r.inventionDetectee)}</td>
                  <td>{r.noteeLe ? formaterDate(r.noteeLe) : ""}</td>
                  <td>{r.relecteur?.email ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

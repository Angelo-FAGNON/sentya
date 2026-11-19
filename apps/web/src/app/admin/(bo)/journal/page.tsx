// Journal des accès (ADMIN uniquement) : connexions et modifications, les plus récentes d'abord.
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { EnTete, parametre, Vide, type ParametresRecherche } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";

export const metadata: Metadata = { title: "Journal des accès" };

const TAILLE_PAGE = 200;

const formatHeure = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Africa/Porto-Novo",
});

export default async function Journal({ searchParams }: { searchParams: ParametresRecherche }) {
  await exigerAdmin("journal");
  const params = await searchParams;
  const type = parametre(params.type);
  const action = parametre(params.action);
  const acteurType = type === "ADMIN" || type === "PARTENAIRE" ? type : undefined;
  const prisma = getPrisma();
  const lignes = await prisma.journalAcces.findMany({
    where: {
      acteurType,
      ...(action ? { action: { contains: action } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: TAILLE_PAGE,
  });
  // Libellés lisibles des acteurs (e-mail), sans afficher de donnée de jeune.
  const ids = [...new Set(lignes.map((l) => l.acteurId))];
  const [admins, partenaires] = await Promise.all([
    prisma.adminUser.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } }),
    prisma.partenaireCompte.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    }),
  ]);
  const emails = new Map([...admins, ...partenaires].map((c) => [c.id, c.email]));

  return (
    <>
      <EnTete titre="Journal des accès" />
      <form method="get" className="mb-6 flex flex-wrap items-end gap-4 rounded bg-slate-50 p-4">
        <div>
          <label htmlFor="filtre-type" className="block font-semibold">
            Acteur
          </label>
          <select id="filtre-type" name="type" defaultValue={acteurType ?? ""} className="champ">
            <option value="">Tous</option>
            <option value="ADMIN">Back-office</option>
            <option value="PARTENAIRE">Partenaires</option>
          </select>
        </div>
        <div>
          <label htmlFor="filtre-action" className="block font-semibold">
            Action contient
          </label>
          <input id="filtre-action" name="action" defaultValue={action ?? ""} className="champ" />
        </div>
        <button type="submit" className="bouton-secondaire">
          Filtrer
        </button>
      </form>
      <p className="mb-4">
        Les {TAILLE_PAGE} dernières lignes au maximum. Heure du Bénin et du Togo.
      </p>
      {lignes.length === 0 ? (
        <Vide>Aucune ligne.</Vide>
      ) : (
        <div className="overflow-x-auto">
          <table className="tableau">
            <caption className="sr-only">Journal des accès</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Acteur</th>
                <th scope="col">Action</th>
                <th scope="col">Ressource</th>
                <th scope="col">IP</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr
                  key={l.id}
                  className={
                    l.action.includes("echec") || l.action.includes("bloquee") ? "bg-red-50" : ""
                  }
                >
                  <td className="whitespace-nowrap">{formatHeure.format(l.createdAt)}</td>
                  <td>
                    {l.acteurType === "ADMIN" ? "Back-office" : "Partenaire"} :{" "}
                    {emails.get(l.acteurId) ?? l.acteurId}
                  </td>
                  <td>
                    <code className="font-mono">{l.action}</code>
                  </td>
                  <td>{l.ressource ?? ""}</td>
                  <td>{l.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

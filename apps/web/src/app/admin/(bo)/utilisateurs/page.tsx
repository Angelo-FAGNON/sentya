import { formaterDate } from "@sentya/core";
import { getPrisma } from "@sentya/db";
import type { Metadata } from "next";
import { EnTete } from "@/composants/admin";
import { BoutonAction, Champ, Formulaire, Liste } from "@/composants/formulaire";
import { exigerAdmin } from "@/lib/garde";
import { MOT_DE_PASSE_MIN } from "@/lib/schemas";
import { LIBELLE_ROLE, ROLES_ADMIN } from "@/lib/valeurs";
import { changerActivation, creerCompte } from "./actions";

export const metadata: Metadata = { title: "Comptes du back-office" };

export default async function Utilisateurs() {
  const admin = await exigerAdmin("utilisateurs");
  const comptes = await getPrisma().adminUser.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      actif: true,
      totpActive: true,
      derniereConnexion: true,
      createdAt: true,
    },
    orderBy: [{ actif: "desc" }, { email: "asc" }],
  });

  return (
    <>
      <EnTete titre="Comptes du back-office" />
      <div className="mb-10 overflow-x-auto">
        <table className="tableau">
          <caption className="sr-only">Comptes administrateurs et curateurs</caption>
          <thead>
            <tr>
              <th scope="col">E-mail</th>
              <th scope="col">Rôle</th>
              <th scope="col">Double authentification</th>
              <th scope="col">Dernière connexion</th>
              <th scope="col">État</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {comptes.map((c) => (
              <tr key={c.id} className={c.actif ? "" : "bg-slate-100"}>
                <td>{c.email}</td>
                <td>{LIBELLE_ROLE[c.role]}</td>
                <td>{c.totpActive ? "Active" : "À configurer"}</td>
                <td>{c.derniereConnexion ? formaterDate(c.derniereConnexion) : "Jamais"}</td>
                <td>{c.actif ? "Actif" : "Désactivé"}</td>
                <td>
                  {c.id === admin.id ? (
                    "Ton compte"
                  ) : (
                    <BoutonAction
                      action={changerActivation.bind(null, c.id, !c.actif)}
                      libelle={c.actif ? `Désactiver ${c.email}` : `Réactiver ${c.email}`}
                      variante={c.actif ? "bouton-danger" : "bouton-secondaire"}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="titre-nouveau" className="max-w-xl">
        <h2 id="titre-nouveau" className="mb-3 text-xl font-semibold">
          Créer un compte
        </h2>
        <Formulaire action={creerCompte} libelleBouton="Créer le compte">
          <Champ nom="email" libelle="E-mail" type="email" requis autoComplete="off" />
          <Champ
            nom="motDePasse"
            libelle="Mot de passe provisoire"
            type="password"
            requis
            autoComplete="new-password"
            aide={`${MOT_DE_PASSE_MIN} caractères au minimum. Transmets-le par un canal sûr.`}
          />
          <Liste
            nom="role"
            libelle="Rôle"
            requis
            valeur="CURATEUR"
            options={ROLES_ADMIN.map((r) => ({ valeur: r, libelle: LIBELLE_ROLE[r] }))}
          />
        </Formulaire>
      </section>
    </>
  );
}

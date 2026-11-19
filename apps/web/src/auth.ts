// Auth.js v5 : sessions JWT, deux fournisseurs « identifiants ».
// - admin : e-mail, mot de passe et code TOTP (obligatoire dès que la double authentification est active) ;
// - partenaire : e-mail et mot de passe.
// Chaque tentative est limitée (5 échecs par 15 minutes par IP et e-mail) et journalisée.
import { getPrisma } from "@sentya/db";
import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { env } from "@/env";
import { dechiffrer } from "@/lib/chiffrement";
import { ipDepuisEntetes } from "@/lib/ip";
import { ACTEUR_INCONNU, journaliser } from "@/lib/journal-acces";
import { LimiteurEchecs, limiteurConnexion } from "@/lib/limiteur";
import { verifierMotDePasse } from "@/lib/mots-de-passe";
import { schemaConnexionAdmin, schemaConnexionPartenaire } from "@/lib/schemas";
import { verifierCodeTotp } from "@/lib/totp";

async function connecterAdmin(brut: unknown, requete: Request): Promise<User | null> {
  const ip = ipDepuisEntetes(requete.headers);
  const saisie = schemaConnexionAdmin.safeParse(brut);
  if (!saisie.success) {
    await journaliser({ type: "ADMIN", id: ACTEUR_INCONNU }, "connexion_echec:saisie", null, ip);
    return null;
  }
  const { email, motDePasse, code } = saisie.data;
  const limiteur = limiteurConnexion();
  const cle = LimiteurEchecs.cle(ip, email);
  const prisma = getPrisma();
  const compte = await prisma.adminUser.findUnique({ where: { email } });
  const acteur = { type: "ADMIN" as const, id: compte?.id ?? ACTEUR_INCONNU };

  if (limiteur.estBloque(cle)) {
    await journaliser(acteur, "connexion_bloquee", null, ip);
    return null;
  }

  // Le mot de passe est toujours vérifié, même pour un compte inconnu (temps constant).
  const motDePasseValide = await verifierMotDePasse(compte?.motDePasseHache, motDePasse);
  if (!compte || !compte.actif || !motDePasseValide) {
    limiteur.enregistrerEchec(cle);
    await journaliser(acteur, "connexion_echec:identifiants", null, ip);
    return null;
  }

  let totpRequis = false;
  if (compte.totpActive) {
    const secret = compte.totpSecret ? dechiffrer(compte.totpSecret, env().AUTH_SECRET) : null;
    if (!secret || !code || !(await verifierCodeTotp(secret, code))) {
      limiteur.enregistrerEchec(cle);
      await journaliser(acteur, "connexion_echec:code_totp", null, ip);
      return null;
    }
  } else {
    // Première connexion : accès limité à l'enrôlement de la double authentification.
    totpRequis = true;
  }

  limiteur.reinitialiser(cle);
  await prisma.adminUser.update({
    where: { id: compte.id },
    data: { derniereConnexion: new Date() },
  });
  await journaliser(acteur, totpRequis ? "connexion_reussie:sans_totp" : "connexion_reussie", null, ip);
  return { id: compte.id, email: compte.email, role: compte.role, partenaireId: null, totpRequis };
}

async function connecterPartenaire(brut: unknown, requete: Request): Promise<User | null> {
  const ip = ipDepuisEntetes(requete.headers);
  const saisie = schemaConnexionPartenaire.safeParse(brut);
  if (!saisie.success) {
    await journaliser({ type: "PARTENAIRE", id: ACTEUR_INCONNU }, "connexion_echec:saisie", null, ip);
    return null;
  }
  const { email, motDePasse } = saisie.data;
  const limiteur = limiteurConnexion();
  const cle = LimiteurEchecs.cle(ip, email);
  const prisma = getPrisma();
  const compte = await prisma.partenaireCompte.findUnique({ where: { email } });
  const acteur = { type: "PARTENAIRE" as const, id: compte?.id ?? ACTEUR_INCONNU };

  if (limiteur.estBloque(cle)) {
    await journaliser(acteur, "connexion_bloquee", null, ip);
    return null;
  }
  const motDePasseValide = await verifierMotDePasse(compte?.motDePasseHache, motDePasse);
  if (!compte || !motDePasseValide) {
    limiteur.enregistrerEchec(cle);
    await journaliser(acteur, "connexion_echec:identifiants", null, ip);
    return null;
  }

  limiteur.reinitialiser(cle);
  await prisma.partenaireCompte.update({
    where: { id: compte.id },
    data: { derniereConnexion: new Date() },
  });
  await journaliser(acteur, "connexion_reussie", null, ip);
  return {
    id: compte.id,
    email: compte.email,
    role: "PARTENAIRE",
    partenaireId: compte.partenaireId,
    totpRequis: false,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "admin",
      name: "Back-office",
      credentials: { email: {}, motDePasse: {}, code: {} },
      authorize: connecterAdmin,
    }),
    Credentials({
      id: "partenaire",
      name: "Espace partenaire",
      credentials: { email: {}, motDePasse: {} },
      authorize: connecterPartenaire,
    }),
  ],
});

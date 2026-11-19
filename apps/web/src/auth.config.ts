// Configuration Auth.js partagée par proxy.ts et auth.ts. Elle n'importe ni la base ni argon2 :
// le proxy n'en a pas besoin pour lire le jeton de session.
import type { NextAuthConfig } from "next-auth";
import { lireSessionBrute } from "@/lib/session";

/** Durée de vie d'une session : 8 heures, puis nouvelle connexion. */
const DUREE_SESSION_S = 8 * 60 * 60;

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: DUREE_SESSION_S },
  pages: { signIn: "/admin/connexion", error: "/admin/connexion" },
  providers: [],
  callbacks: {
    // À la connexion, on recopie dans le jeton les champs renvoyés par authorize().
    jwt({ token, user }) {
      if (user) {
        const infos = lireSessionBrute(user);
        if (infos) {
          token.id = infos.id;
          token.role = infos.role;
          token.partenaireId = infos.partenaireId;
          token.totpRequis = infos.totpRequis;
        }
      }
      return token;
    },
    session({ session, token }) {
      const infos = lireSessionBrute(token);
      return {
        ...session,
        user: infos
          ? {
              ...session.user,
              id: infos.id,
              role: infos.role,
              partenaireId: infos.partenaireId,
              totpRequis: infos.totpRequis,
            }
          : session.user,
      };
    },
  },
} satisfies NextAuthConfig;

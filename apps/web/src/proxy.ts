// Proxy Next.js 16 (ancien middleware) : CSP avec nonce par requête, redirections de
// connexion et en-têtes de cache. Les vérifications de rôle définitives sont refaites côté
// serveur dans chaque page et chaque action (src/lib/garde.ts) : ce filtre n'est qu'un premier rideau.
import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { construireCsp } from "@/lib/csp";
import { lireSessionBrute, type InfosSession } from "@/lib/session";

const { auth } = NextAuth(authConfig);

const PAGES_ADMIN_LIBRES = ["/admin/connexion"];
const PAGES_PARTENAIRE_LIBRES = ["/partenaire/connexion", "/partenaire/inscription"];

function commencePar(chemin: string, prefixe: string) {
  return chemin === prefixe || chemin.startsWith(`${prefixe}/`);
}

function estZonePrivee(chemin: string) {
  return commencePar(chemin, "/admin") || commencePar(chemin, "/partenaire");
}

function traiter(requete: NextRequest, session: InfosSession | null): Response {
  const { pathname } = requete.nextUrl;
  const rediriger = (cible: string) => NextResponse.redirect(new URL(cible, requete.nextUrl));

  if (commencePar(pathname, "/admin") && !PAGES_ADMIN_LIBRES.includes(pathname)) {
    if (!session) return rediriger("/admin/connexion");
    if (session.role === "PARTENAIRE") return rediriger("/partenaire");
    if (session.totpRequis && pathname !== "/admin/2fa") return rediriger("/admin/2fa");
  }
  if (commencePar(pathname, "/partenaire") && !PAGES_PARTENAIRE_LIBRES.includes(pathname)) {
    if (!session || session.role !== "PARTENAIRE") return rediriger("/partenaire/connexion");
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = construireCsp(nonce, {
    developpement: process.env.NODE_ENV === "development",
    https: (process.env.APP_URL ?? "").startsWith("https://"),
  });

  const entetesRequete = new Headers(requete.headers);
  entetesRequete.set("x-nonce", nonce);
  entetesRequete.set("Content-Security-Policy", csp);
  const reponse = NextResponse.next({ request: { headers: entetesRequete } });
  reponse.headers.set("Content-Security-Policy", csp);

  // Pages privées : jamais en cache, jamais indexées (lien magique, back-office, partenaires).
  if (commencePar(pathname, "/monplan") || estZonePrivee(pathname)) {
    reponse.headers.set("Cache-Control", "no-store, max-age=0");
    reponse.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return reponse;
}

// La session n'est lue que dans les zones privées : les pages publiques ne posent aucun cookie.
const traiterAvecSession = auth((requete) => traiter(requete, lireSessionBrute(requete.auth?.user)));

export default function proxy(requete: NextRequest) {
  if (estZonePrivee(requete.nextUrl.pathname)) {
    return traiterAvecSession(requete, { params: Promise.resolve({}) });
  }
  return traiter(requete, null);
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

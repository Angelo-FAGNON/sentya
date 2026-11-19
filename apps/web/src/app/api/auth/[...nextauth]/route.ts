// Routes Auth.js (/api/auth/*). Les POST vérifient en plus l'en-tête Origin (défense en profondeur,
// Auth.js vérifie déjà son propre jeton CSRF).
import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { env } from "@/env";
import { origineAutorisee } from "@/lib/origine";

export const GET = handlers.GET;

export function POST(requete: NextRequest) {
  if (!origineAutorisee(requete, env().APP_URL)) {
    return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  }
  return handlers.POST(requete);
}

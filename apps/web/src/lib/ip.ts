// Adresse IP du client, telle que transmise par le proxy inverse (Caddy, Lot 5).
// On prend la DERNIÈRE adresse de X-Forwarded-For : c'est celle ajoutée par le proxy le plus
// proche, alors que les premières peuvent être inventées par le client. Next.js seul ne réécrit
// pas cet en-tête : en production, le site doit rester derrière le proxy inverse.

export function ipDepuisEntetes(entetes: Headers): string {
  const adresses = (entetes.get("x-forwarded-for") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return adresses.at(-1) || entetes.get("x-real-ip")?.trim() || "inconnue";
}

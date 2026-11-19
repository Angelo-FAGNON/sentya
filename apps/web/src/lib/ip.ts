// Adresse IP du client, telle que transmise par le proxy inverse (Caddy).

export function ipDepuisEntetes(entetes: Headers): string {
  const transmise = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();
  return transmise || entetes.get("x-real-ip")?.trim() || "inconnue";
}

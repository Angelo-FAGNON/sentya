// Protection CSRF des routes POST maison : l'en-tête Origin doit correspondre à APP_URL.
// Les Server Actions sont déjà protégées par Next.js (comparaison Origin et Host).

export function origineAutorisee(requete: Request, appUrl: string): boolean {
  const origine = requete.headers.get("origin");
  if (!origine) return false;
  try {
    return new URL(origine).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

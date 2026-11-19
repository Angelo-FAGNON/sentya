// Exécuté une fois au démarrage du serveur : on refuse de démarrer si la configuration est invalide.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validerEnv } = await import("./env");
    validerEnv();
  }
}

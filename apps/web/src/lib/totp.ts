// Double authentification par code à 6 chiffres (TOTP, RFC 6238), compatible avec les
// applications d'authentification courantes : SHA-1, 6 chiffres, période de 30 secondes.
import { generate, generateSecret, generateURI, verify } from "otplib";

export const EMETTEUR_TOTP = "Sentya";
/** Tolérance d'une période (30 s) avant et après, pour absorber un léger décalage d'horloge. */
const TOLERANCE_S = 30;

export function nouveauSecretTotp(): string {
  return generateSecret();
}

export function uriTotp(secret: string, email: string): string {
  return generateURI({ issuer: EMETTEUR_TOTP, label: email, secret });
}

/** Code attendu à un instant donné (utile aux tests). */
export function codeTotp(secret: string, instant: Date = new Date()): Promise<string> {
  return generate({ secret, epoch: Math.floor(instant.getTime() / 1000) });
}

/** Vérifie un code saisi. Toute saisie qui n'est pas 6 chiffres est refusée sans calcul. */
export async function verifierCodeTotp(
  secret: string,
  code: string,
  instant: Date = new Date(),
): Promise<boolean> {
  const nettoye = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(nettoye)) return false;
  try {
    const resultat = await verify({
      secret,
      token: nettoye,
      epoch: Math.floor(instant.getTime() / 1000),
      epochTolerance: TOLERANCE_S,
    });
    return resultat.valid;
  } catch {
    return false;
  }
}

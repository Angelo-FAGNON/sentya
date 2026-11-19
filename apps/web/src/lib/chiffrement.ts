// Chiffrement du secret TOTP en base : AES-256-GCM, clé dérivée de AUTH_SECRET par HKDF-SHA256
// avec une étiquette de contexte. Format stocké : "v1.<iv>.<etiquette>.<chiffre>" (base64url).
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const VERSION = "v1";
const SEL_HKDF = "sentya";
const CONTEXTE_HKDF = "sentya/totp-secret/v1";
const TAILLE_IV = 12;

/** Dérive la clé de 32 octets à partir du secret de l'application. */
export function deriverCle(secretApplication: string): Buffer {
  if (!secretApplication) throw new Error("Secret de l'application manquant.");
  return Buffer.from(hkdfSync("sha256", secretApplication, SEL_HKDF, CONTEXTE_HKDF, 32));
}

export function chiffrer(texteClair: string, secretApplication: string): string {
  const iv = randomBytes(TAILLE_IV);
  const chiffreur = createCipheriv("aes-256-gcm", deriverCle(secretApplication), iv);
  const chiffre = Buffer.concat([chiffreur.update(texteClair, "utf8"), chiffreur.final()]);
  const etiquette = chiffreur.getAuthTag();
  return [VERSION, iv, etiquette, chiffre]
    .map((partie) => (typeof partie === "string" ? partie : partie.toString("base64url")))
    .join(".");
}

/** Déchiffre et authentifie. Lève une erreur si la donnée a été modifiée ou si la clé diffère. */
export function dechiffrer(donnee: string, secretApplication: string): string {
  const [version, iv, etiquette, chiffre] = donnee.split(".");
  if (version !== VERSION || !iv || !etiquette || chiffre === undefined) {
    throw new Error("Format de donnée chiffrée inconnu.");
  }
  const dechiffreur = createDecipheriv(
    "aes-256-gcm",
    deriverCle(secretApplication),
    Buffer.from(iv, "base64url"),
  );
  dechiffreur.setAuthTag(Buffer.from(etiquette, "base64url"));
  return Buffer.concat([
    dechiffreur.update(Buffer.from(chiffre, "base64url")),
    dechiffreur.final(),
  ]).toString("utf8");
}

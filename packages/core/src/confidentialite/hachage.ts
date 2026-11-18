// Hachages et jetons : identifiants pour les analyses, liens magiques.
import { createHash, createHmac, randomBytes } from "node:crypto";

/** HMAC-SHA256 de l'identifiant de canal : seule clé utilisée dans les analyses (H3). */
export function hacherIdentifiant(canal: string, idCanal: string | bigint, sel: string): string {
  return createHmac("sha256", sel)
    .update(`${canal}:${String(idCanal)}`)
    .digest("hex");
}

/** Valeur aléatoire qui remplace un hachage pour rompre le lien (RG-11, RG-12). */
export function hachageAleatoire(): string {
  return `anon_${randomBytes(16).toString("hex")}`;
}

export function sha256(texte: string): string {
  return createHash("sha256").update(texte).digest("hex");
}

/** Jeton aléatoire de 32 octets : seul son SHA-256 est stocké en base. */
export function genererJeton(): { jeton: string; hash: string } {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, hash: sha256(jeton) };
}

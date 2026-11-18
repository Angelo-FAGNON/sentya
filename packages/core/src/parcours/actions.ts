// Identifiants des actions de boutons (64 octets maximum, limite Telegram).
// Avant consentement, le pays et le code d'acquisition voyagent dans ces actions (H4).

export const ACTIONS = {
  pays: (pays: "BJ" | "TG", source: string) => `pays:${pays}:${source}`,
  consentement: (pays: "BJ" | "TG", source: string) => `cons:${pays}:${source}`,
  plusTard: "tard",
  majeur: (pays: "BJ" | "TG", source: string) => `maj:${pays}:${source}`,
  mineur: "min",
  continuerSansCv: "cv:non",
  competencesOk: "comp:ok",
  competencesCorriger: "comp:corr",
  voirPiste: (rang: number) => `voir:${rang}`,
  choisirPiste: (rang: number) => `choisir:${rang}`,
  retourPistes: "pistes",
  statutEtape: (etapeId: string, statut: "F" | "B" | "A") => `et:${etapeId}:${statut}`,
  signaler: (opportuniteId: string) => `sig:${opportuniteId}`,
  candidater: (opportuniteId: string) => `cand:${opportuniteId}`,
  candidatureOui: (opportuniteId: string) => `candok:${opportuniteId}`,
  candidatureNon: "candno",
  pdf: "pdf",
  audio: (actif: boolean) => (actif ? "audio:on" : "audio:off"),
  recommencerOui: "rec:oui",
  recommencerNon: "rec:non",
  supprimer1: "sup:1",
  supprimer2: "sup:2",
  supprimerNon: "sup:non",
} as const;

/** Code d'acquisition du lien profond, réduit pour tenir dans les actions. */
export function sourceCourte(payload: string | undefined): string {
  return (payload ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 16);
}

/** Découpe une action "prefixe:a:b" en morceaux. */
export function lireAction(action: string): { prefixe: string; args: string[] } {
  const [prefixe = "", ...args] = action.split(":");
  return { prefixe, args };
}

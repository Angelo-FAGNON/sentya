// Limitation du débit par jeune : 20 messages par minute (fenêtre glissante, en mémoire, H8).

export class LimiteurDebit {
  private readonly historique = new Map<string, number[]>();
  private readonly prevenus = new Map<string, number>();

  constructor(
    private readonly maximum = 20,
    private readonly fenetreMs = 60_000,
  ) {}

  /** Renvoie "ok", "refuse_prevenir" (premier refus de la fenêtre) ou "refuse". */
  verifier(cle: string, maintenant: number): "ok" | "refuse_prevenir" | "refuse" {
    const recents = (this.historique.get(cle) ?? []).filter((t) => maintenant - t < this.fenetreMs);
    if (recents.length >= this.maximum) {
      this.historique.set(cle, recents);
      const dernierAvertissement = this.prevenus.get(cle);
      if (
        dernierAvertissement === undefined ||
        maintenant - dernierAvertissement >= this.fenetreMs
      ) {
        this.prevenus.set(cle, maintenant);
        return "refuse_prevenir";
      }
      return "refuse";
    }
    recents.push(maintenant);
    this.historique.set(cle, recents);
    return "ok";
  }

  /** Nettoie les entrées anciennes (appelé régulièrement). */
  nettoyer(maintenant: number): void {
    for (const [cle, temps] of this.historique) {
      if (temps.every((t) => maintenant - t >= this.fenetreMs)) this.historique.delete(cle);
    }
    for (const [cle, t] of this.prevenus)
      if (maintenant - t >= this.fenetreMs) this.prevenus.delete(cle);
  }
}

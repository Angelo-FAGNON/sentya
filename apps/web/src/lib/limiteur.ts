// Limitation des échecs de connexion, en mémoire (un seul serveur dans le MVP, hypothèse H8) :
// 5 échecs par fenêtre glissante de 15 minutes pour un couple (adresse IP, e-mail).

export const ECHECS_MAX = 5;
export const FENETRE_MS = 15 * 60 * 1000;

export class LimiteurEchecs {
  private readonly echecs = new Map<string, number[]>();

  constructor(
    private readonly maximum = ECHECS_MAX,
    private readonly fenetreMs = FENETRE_MS,
    private readonly maintenant: () => number = Date.now,
  ) {}

  static cle(ip: string, email: string): string {
    return `${ip}|${email.trim().toLowerCase()}`;
  }

  private recents(cle: string): number[] {
    const limite = this.maintenant() - this.fenetreMs;
    const liste = (this.echecs.get(cle) ?? []).filter((instant) => instant > limite);
    if (liste.length === 0) this.echecs.delete(cle);
    else this.echecs.set(cle, liste);
    return liste;
  }

  /** Vrai si la clé a atteint le maximum d'échecs dans la fenêtre. */
  estBloque(cle: string): boolean {
    return this.recents(cle).length >= this.maximum;
  }

  enregistrerEchec(cle: string): void {
    const liste = this.recents(cle);
    liste.push(this.maintenant());
    this.echecs.set(cle, liste);
    if (this.echecs.size > 10_000) this.purger();
  }

  /** Une connexion réussie efface le compteur. */
  reinitialiser(cle: string): void {
    this.echecs.delete(cle);
  }

  /** Retire les clés expirées, pour borner la mémoire. */
  purger(): void {
    for (const cle of [...this.echecs.keys()]) this.recents(cle);
  }
}

const globalPourLimiteur = globalThis as unknown as { limiteurConnexion?: LimiteurEchecs };

/** Limiteur partagé par les deux fournisseurs de connexion. */
export function limiteurConnexion(): LimiteurEchecs {
  globalPourLimiteur.limiteurConnexion ??= new LimiteurEchecs();
  return globalPourLimiteur.limiteurConnexion;
}

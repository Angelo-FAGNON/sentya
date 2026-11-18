// Verrou par jeune : ses messages sont traités un par un, dans l'ordre d'arrivée,
// même en mode webhook où Telegram peut envoyer plusieurs requêtes en parallèle.

export class VerrouParCle {
  private readonly files = new Map<string, Promise<unknown>>();

  async executer<T>(cle: string, tache: () => Promise<T>): Promise<T> {
    const precedente = this.files.get(cle) ?? Promise.resolve();
    const suivante = precedente.catch(() => undefined).then(tache);
    this.files.set(cle, suivante);
    try {
      return await suivante;
    } finally {
      if (this.files.get(cle) === suivante) this.files.delete(cle);
    }
  }
}

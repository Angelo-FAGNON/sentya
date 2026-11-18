// Fournisseur d'IA factice pour les tests : aucune requête réseau.
// Chaque appel est enregistré, et la réponse vient d'une fonction fournie par le test.
import type { AudioSynthetise, FournisseurIA, RequeteJson } from "./fournisseur";

export type Repondeur = (requete: RequeteJson, numeroAppel: number) => unknown | Promise<unknown>;

export class FournisseurFactice implements FournisseurIA {
  readonly modele = "factice";
  readonly appels: RequeteJson[] = [];
  readonly voix: string[] = [];

  constructor(private readonly repondeur: Repondeur) {}

  async genererJson(requete: RequeteJson): Promise<unknown> {
    this.appels.push(requete);
    return this.repondeur(requete, this.appels.length);
  }

  async synthetiserVoix(texte: string): Promise<AudioSynthetise> {
    this.voix.push(texte);
    return { pcm: Buffer.alloc(480), frequence: 24000 };
  }

  /** Appels filtrés par identifiant de prompt (ex. "choix-pistes"). */
  appelsPour(idPrompt: string): RequeteJson[] {
    return this.appels.filter((a) => a.version.startsWith(`${idPrompt}@`));
  }
}

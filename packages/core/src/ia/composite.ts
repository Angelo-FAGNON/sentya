// Réunit deux fournisseurs : un pour le raisonnement (Claude), un pour l'audio (Gemini).
// Toute requête qui porte un fichier audio, et la synthèse vocale, vont au fournisseur audio ;
// le reste va au fournisseur de raisonnement. Sans fournisseur audio, l'audio est indisponible.
import {
  SortieIAInvalideError,
  type AudioSynthetise,
  type FournisseurIA,
  type RequeteJson,
} from "./fournisseur";

export class FournisseurComposite implements FournisseurIA {
  readonly modele: string;
  readonly audioDisponible: boolean;

  constructor(
    private readonly raisonnement: FournisseurIA,
    private readonly audio?: FournisseurIA,
  ) {
    this.modele = raisonnement.modele;
    this.audioDisponible = !!audio && audio.audioDisponible !== false;
  }

  async genererJson(requete: RequeteJson): Promise<unknown> {
    if (requete.media?.mimeType.startsWith("audio/")) {
      if (!this.audio) throw new SortieIAInvalideError("Aucun fournisseur audio configure.");
      return this.audio.genererJson(requete);
    }
    return this.raisonnement.genererJson(requete);
  }

  async synthetiserVoix(texte: string, delaiMs: number): Promise<AudioSynthetise> {
    if (!this.audio) throw new SortieIAInvalideError("Aucun fournisseur audio configure.");
    return this.audio.synthetiserVoix(texte, delaiMs);
  }
}

// Fournisseur utilisé quand GEMINI_API_KEY est absente (démonstration, panne prolongée).
// Chaque appel échoue aussitôt comme une sortie invalide : les replis déterministes prennent
// le relais sans attente (compétences par mots-clés, pistes "à explorer", pas d'audio).
import { SortieIAInvalideError, type AudioSynthetise, type FournisseurIA } from "./fournisseur";

export class FournisseurSansIA implements FournisseurIA {
  readonly modele = "sans-ia";

  async genererJson(): Promise<unknown> {
    throw new SortieIAInvalideError("IA desactivee : GEMINI_API_KEY absente.");
  }

  async synthetiserVoix(): Promise<AudioSynthetise> {
    throw new SortieIAInvalideError("IA desactivee : synthese vocale indisponible.");
  }
}

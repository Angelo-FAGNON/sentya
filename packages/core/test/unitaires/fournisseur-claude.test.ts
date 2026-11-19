// Fournisseur Claude : requête envoyée (modèle, sortie structurée, repli serveur, CV),
// lecture de la sortie et classement des erreurs. Aucun appel réseau : fetch simulé.
import { describe, expect, it } from "vitest";
import { appelerAvecSchema } from "../../src/ia/appel-structure";
import { FournisseurClaude } from "../../src/ia/claude";
import { FournisseurComposite } from "../../src/ia/composite";
import { FournisseurFactice } from "../../src/ia/factice";
import { IAIndisponibleError, SortieIAInvalideError } from "../../src/ia/fournisseur";
import { schemaChoixPistes, schemaExtraction, versJsonSchema } from "../../src/ia/schemas";
import { journalSilencieux } from "../../src/journal";

interface Capture {
  corps: Record<string, unknown>;
  entetes: Headers;
}

function fetchSimule(statut: number, corps: unknown, captures: Capture[] = []) {
  return (async (_url: string | URL | Request, init?: RequestInit) => {
    captures.push({ corps: JSON.parse(String(init?.body)), entetes: new Headers(init?.headers) });
    return new Response(JSON.stringify(corps), {
      status: statut,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

function reponseClaude(texte: string, stop = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text: texte }],
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

const SORTIE = {
  pistes: [
    {
      metierId: "bj-couture",
      voie: "EMPLOI",
      raison: "Tu couds depuis 3 ans.",
      conditionPrincipale: "Un atelier.",
    },
  ],
};

const requete = (media?: { mimeType: string; donnees: Buffer }) => ({
  version: "choix-pistes@1",
  systeme: "Consignes du système.",
  texte: "{}",
  media,
  schema: schemaChoixPistes,
  schemaJson: versJsonSchema(schemaChoixPistes),
  delaiMs: 5000,
});

describe("FournisseurClaude", () => {
  it("envoie le modèle, l'effort, la sortie structurée et le repli serveur", async () => {
    const captures: Capture[] = [];
    const claude = new FournisseurClaude({
      apiKey: "cle-de-test",
      modele: "claude-opus-5-5",
      fetch: fetchSimule(200, reponseClaude(JSON.stringify(SORTIE)), captures),
    });
    expect(await claude.genererJson(requete())).toEqual(SORTIE);

    const { corps, entetes } = captures[0]!;
    expect(corps).toMatchObject({
      model: "claude-opus-5-5",
      system: "Consignes du système.",
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema" } },
    });
    expect(entetes.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    expect(claude.audioDisponible).toBe(false);
  });

  it("place un CV PDF en bloc document, une photo en bloc image, avant le texte", async () => {
    const captures: Capture[] = [];
    const claude = new FournisseurClaude({
      apiKey: "cle-de-test",
      modele: "claude-opus-5-5",
      fetch: fetchSimule(200, reponseClaude(JSON.stringify(SORTIE)), captures),
    });
    await claude.genererJson(
      requete({ mimeType: "application/pdf", donnees: Buffer.from("%PDF") }),
    );
    await claude.genererJson(requete({ mimeType: "image/jpeg", donnees: Buffer.from("jpg") }));
    const contenus = captures.map(
      (c) => (c.corps.messages as { content: { type: string }[] }[])[0]!.content,
    );
    expect(contenus[0]!.map((b) => b.type)).toEqual(["document", "text"]);
    expect(contenus[1]!.map((b) => b.type)).toEqual(["image", "text"]);
  });

  it("refuse un fichier audio : Claude ne lit pas l'audio", async () => {
    const claude = new FournisseurClaude({
      apiKey: "k",
      modele: "claude-opus-5-5",
      fetch: fetchSimule(200, {}),
    });
    await expect(
      claude.genererJson(requete({ mimeType: "audio/ogg", donnees: Buffer.from("o") })),
    ).rejects.toBeInstanceOf(SortieIAInvalideError);
  });

  it.each([
    [429, IAIndisponibleError],
    [529, IAIndisponibleError],
    [503, IAIndisponibleError],
    [400, SortieIAInvalideError],
  ])("classe une erreur HTTP %i", async (statut, classe) => {
    const claude = new FournisseurClaude({
      apiKey: "k",
      modele: "claude-opus-5-5",
      fetch: fetchSimule(statut, { type: "error", error: { type: "erreur", message: "x" } }),
    });
    await expect(claude.genererJson(requete())).rejects.toBeInstanceOf(classe);
  });

  it("traite un refus ou une réponse tronquée comme une sortie invalide (repli)", async () => {
    for (const stop of ["refusal", "max_tokens"]) {
      const claude = new FournisseurClaude({
        apiKey: "k",
        modele: "claude-opus-5-5",
        fetch: fetchSimule(200, reponseClaude("{}", stop)),
      });
      await expect(claude.genererJson(requete())).rejects.toBeInstanceOf(SortieIAInvalideError);
    }
  });

  it("s'intègre à appelerAvecSchema : une sortie non conforme déclenche le repli", async () => {
    const claude = new FournisseurClaude({
      apiKey: "k",
      modele: "claude-opus-5-5",
      fetch: fetchSimule(200, reponseClaude(JSON.stringify({ autre: 1 }))),
    });
    const r = await appelerAvecSchema(
      claude,
      {
        version: "extraction-competences@1",
        systeme: "s",
        texte: "{}",
        schema: schemaExtraction,
        delaiMs: 5000,
      },
      journalSilencieux,
    );
    expect(r.ok).toBe(false);
  });
});

describe("FournisseurComposite", () => {
  it("envoie l'audio au fournisseur audio et le reste au raisonnement", async () => {
    const raisonnement = new FournisseurFactice(() => "raisonnement");
    const audio = new FournisseurFactice(() => "audio");
    const ia = new FournisseurComposite(raisonnement, audio);
    expect(await ia.genererJson(requete())).toBe("raisonnement");
    expect(
      await ia.genererJson(requete({ mimeType: "audio/ogg", donnees: Buffer.from("o") })),
    ).toBe("audio");
    expect(ia.audioDisponible).toBe(true);
    await ia.synthetiserVoix("Bonjour", 1000);
    expect(audio.voix).toEqual(["Bonjour"]);
  });

  it("sans fournisseur audio, l'audio est indisponible", async () => {
    const ia = new FournisseurComposite(new FournisseurFactice(() => "r"));
    expect(ia.audioDisponible).toBe(false);
    await expect(
      ia.genererJson(requete({ mimeType: "audio/ogg", donnees: Buffer.from("o") })),
    ).rejects.toBeInstanceOf(SortieIAInvalideError);
    await expect(ia.synthetiserVoix("x", 1000)).rejects.toBeInstanceOf(SortieIAInvalideError);
  });
});

// Prompts versionnés : la version en service et ses exigences principales.
import { describe, expect, it } from "vitest";
import { PROMPT_CHOIX_PISTES_V1 } from "../../src/prompts/choix-pistes.v1";
import { PROMPT_CHOIX_PISTES } from "../../src/prompts/choix-pistes.v2";

describe("prompt de choix des pistes", () => {
  it("la version 2 est en service et garde la v1 pour l'historique", () => {
    expect(PROMPT_CHOIX_PISTES.version).toBe("choix-pistes@2");
    expect(PROMPT_CHOIX_PISTES_V1.version).toBe("choix-pistes@1");
  });

  it("exige toujours exactement 3 pistes, ancrées sur les candidats, sans invention", () => {
    const s = PROMPT_CHOIX_PISTES.systeme;
    expect(s).toMatch(/TOUJOURS exactement 3 pistes/);
    expect(s).toMatch(/UNIQUEMENT parmi les métiers de la liste "candidats"/);
    expect(s).toMatch(/JAMAIS de prix, de salaire, de durée/);
    expect(s).toMatch(/ne promets jamais de résultat/);
  });
});

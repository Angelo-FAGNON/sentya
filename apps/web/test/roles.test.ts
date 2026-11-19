// Garde de rôle : matrice des permissions et décision d'accès relue en base.
import { describe, expect, it } from "vitest";
import {
  aLaPermission,
  deciderAccesAdmin,
  deciderAccesPartenaire,
  PERMISSIONS,
  type CompteAdminEnBase,
  type SessionMinimale,
} from "@/lib/roles";

const admin: CompteAdminEnBase = { id: "a1", role: "ADMIN", actif: true, totpActive: true };
const curateur: CompteAdminEnBase = { id: "c1", role: "CURATEUR", actif: true, totpActive: true };
const session = (
  id: string,
  role: SessionMinimale["role"],
  totpRequis = false,
): SessionMinimale => ({
  id,
  role,
  totpRequis,
});

describe("matrice des permissions", () => {
  it("ADMIN peut tout faire dans le back-office", () => {
    for (const p of PERMISSIONS.filter((p) => p !== "espace_partenaire")) {
      expect(aLaPermission("ADMIN", p)).toBe(true);
    }
  });

  it("CURATEUR gère référentiel, signalements, revue et tableau de bord seulement", () => {
    expect(aLaPermission("CURATEUR", "referentiel")).toBe(true);
    expect(aLaPermission("CURATEUR", "signalements")).toBe(true);
    expect(aLaPermission("CURATEUR", "revue")).toBe(true);
    expect(aLaPermission("CURATEUR", "tableau")).toBe(true);
    expect(aLaPermission("CURATEUR", "partenaires")).toBe(false);
    expect(aLaPermission("CURATEUR", "utilisateurs")).toBe(false);
    expect(aLaPermission("CURATEUR", "journal")).toBe(false);
  });

  it("PARTENAIRE n'accède qu'à l'espace partenaire", () => {
    for (const p of PERMISSIONS) {
      expect(aLaPermission("PARTENAIRE", p)).toBe(p === "espace_partenaire");
    }
  });
});

describe("décision d'accès au back-office", () => {
  it("autorise un compte actif, avec double authentification et la permission", () => {
    expect(deciderAccesAdmin(session("a1", "ADMIN"), admin, "journal")).toEqual({
      type: "autorise",
      role: "ADMIN",
    });
  });

  it("renvoie à la connexion sans session, pour un partenaire, ou un compte inconnu", () => {
    expect(deciderAccesAdmin(null, admin, "tableau").type).toBe("connexion");
    expect(deciderAccesAdmin(session("p1", "PARTENAIRE"), null, "tableau").type).toBe("connexion");
    expect(deciderAccesAdmin(session("a1", "ADMIN"), null, "tableau").type).toBe("connexion");
    expect(deciderAccesAdmin(session("x", "ADMIN"), admin, "tableau").type).toBe("connexion");
  });

  it("un compte désactivé perd l'accès immédiatement", () => {
    expect(
      deciderAccesAdmin(session("a1", "ADMIN"), { ...admin, actif: false }, "tableau").type,
    ).toBe("connexion");
  });

  it("force l'enrôlement TOTP tant qu'il n'est pas fait, ou si la session a été ouverte sans code", () => {
    expect(
      deciderAccesAdmin(session("a1", "ADMIN"), { ...admin, totpActive: false }, "tableau").type,
    ).toBe("double_authentification");
    expect(deciderAccesAdmin(session("a1", "ADMIN", true), admin, "tableau").type).toBe(
      "double_authentification",
    );
  });

  it("le rôle vient de la base, pas du jeton", () => {
    // Jeton qui prétend ADMIN, mais le compte est CURATEUR en base.
    expect(deciderAccesAdmin(session("c1", "ADMIN"), curateur, "utilisateurs").type).toBe("refuse");
    expect(deciderAccesAdmin(session("c1", "CURATEUR"), curateur, "referentiel").type).toBe(
      "autorise",
    );
  });
});

describe("décision d'accès à l'espace partenaire", () => {
  it("autorise un compte partenaire existant", () => {
    expect(
      deciderAccesPartenaire(session("p1", "PARTENAIRE"), { id: "p1", partenaireId: "org" }),
    ).toEqual({
      type: "autorise",
      partenaireId: "org",
    });
  });

  it("refuse les sessions du back-office et les comptes supprimés", () => {
    expect(
      deciderAccesPartenaire(session("a1", "ADMIN"), { id: "a1", partenaireId: "org" }).type,
    ).toBe("connexion");
    expect(deciderAccesPartenaire(session("p1", "PARTENAIRE"), null).type).toBe("connexion");
    expect(deciderAccesPartenaire(null, null).type).toBe("connexion");
  });
});

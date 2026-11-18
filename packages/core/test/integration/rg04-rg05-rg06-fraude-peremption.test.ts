// RG-04 (péremption à 6 mois), RG-05 (vérification par un curateur, frais refusés),
// RG-06 (3 signalements suspendent l'opportunité, alerte de revue sous 48 heures).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { opportunitesVisibles } from "../../src/orientation/plan";
import {
  alertesRevueEnRetard,
  OffreRefuseeError,
  signalerOpportunite,
  soumettreOpportunite,
  traiterSignalements,
  verifierOpportunite,
} from "../../src/regles/fraude";
import { marquerFichesPerimees } from "../../src/regles/peremption";
import { supprimerUtilisateur } from "../../src/regles/suppression";
import {
  contexteTest,
  creerJeune,
  creerOpportuniteVerifiee,
  creerReferentiel,
  prismaTest,
  viderBase,
} from "../outils/base";

const prisma = prismaTest();
beforeEach(async () => {
  await viderBase();
  await creerReferentiel();
});
afterAll(() => prisma.$disconnect());

const offre = {
  pays: "BJ" as const,
  metierId: "bj-couture",
  titre: "Apprenti couturier",
  lieu: "Cotonou",
  contact: "contact@atelier.example",
  sourceUrl: "https://atelier.example/offre",
};

describe("RG-05 : vérification et refus des offres frauduleuses", () => {
  it("une offre soumise arrive en BROUILLON et n'est pas proposée", async () => {
    const { ctx } = contexteTest();
    const o = await soumettreOpportunite(prisma, { ...offre, description: "Atelier recrute." });
    expect(o.statut).toBe("BROUILLON");
    expect(
      await opportunitesVisibles(prisma, {
        pays: "BJ",
        metierId: "bj-couture",
        maintenant: ctx.horloge.maintenant(),
      }),
    ).toHaveLength(0);
  });

  it("refuse une offre qui demande des frais au candidat", async () => {
    await expect(
      soumettreOpportunite(prisma, { ...offre, description: "Frais de dossier : 10 000 F." }),
    ).rejects.toBeInstanceOf(OffreRefuseeError);
    expect(await prisma.opportunite.count()).toBe(0);
  });

  it("enregistre une alerte préventive non bloquante", async () => {
    const o = await soumettreOpportunite(prisma, {
      ...offre,
      description: "Contact uniquement par WhatsApp.",
    });
    expect(o).toMatchObject({ alerteFraude: true, motifsAlerte: ["WhatsApp seul"] });
  });

  it("seul le curateur passe l'offre à VERIFIEE, avec la date de vérification", async () => {
    const { ctx } = contexteTest();
    const o = await soumettreOpportunite(prisma, { ...offre, description: "Atelier recrute." });
    const verifiee = await verifierOpportunite(ctx, o.id);
    expect(verifiee).toMatchObject({ statut: "VERIFIEE", verifieLe: ctx.horloge.maintenant() });
    expect(
      await opportunitesVisibles(prisma, {
        pays: "BJ",
        metierId: "bj-couture",
        maintenant: ctx.horloge.maintenant(),
      }),
    ).toHaveLength(1);
  });

  it("une offre modifiée pour demander des frais ne peut jamais être vérifiée", async () => {
    const { ctx } = contexteTest();
    const o = await soumettreOpportunite(prisma, { ...offre, description: "Atelier recrute." });
    await prisma.opportunite.update({
      where: { id: o.id },
      data: { description: "Frais de dossier obligatoires." },
    });
    await expect(verifierOpportunite(ctx, o.id)).rejects.toBeInstanceOf(OffreRefuseeError);
  });
});

describe("RG-06 : signalements", () => {
  it("3 signalements indépendants suspendent l'opportunité immédiatement", async () => {
    const { ctx } = contexteTest();
    const o = await creerOpportuniteVerifiee(prisma);
    const jeunes = [
      await creerJeune(ctx, "1"),
      await creerJeune(ctx, "2"),
      await creerJeune(ctx, "3"),
    ];

    expect(
      await signalerOpportunite(ctx, {
        opportuniteId: o.id,
        userId: jeunes[0]!.id,
        motif: "Frais",
      }),
    ).toBe("ENREGISTRE");
    expect(
      await signalerOpportunite(ctx, {
        opportuniteId: o.id,
        userId: jeunes[0]!.id,
        motif: "Encore",
      }),
    ).toBe("DEJA_SIGNALE");
    expect(
      await signalerOpportunite(ctx, {
        opportuniteId: o.id,
        userId: jeunes[1]!.id,
        motif: "Frais",
      }),
    ).toBe("ENREGISTRE");
    const maintenant = ctx.horloge.maintenant();
    expect(
      await opportunitesVisibles(prisma, { pays: "BJ", metierId: "bj-couture", maintenant }),
    ).toHaveLength(1);

    expect(
      await signalerOpportunite(ctx, {
        opportuniteId: o.id,
        userId: jeunes[2]!.id,
        motif: "Frais",
      }),
    ).toBe("SUSPENDUE");
    expect(await prisma.opportunite.findUniqueOrThrow({ where: { id: o.id } })).toMatchObject({
      statut: "SUSPENDUE",
      nbSignalements: 3,
      suspendueLe: maintenant,
    });
    expect(
      await opportunitesVisibles(prisma, { pays: "BJ", metierId: "bj-couture", maintenant }),
    ).toHaveLength(0);
  });

  it("la suppression d'un signaleur ne lève pas la suspension", async () => {
    const { ctx } = contexteTest();
    const o = await creerOpportuniteVerifiee(prisma);
    const jeunes = [
      await creerJeune(ctx, "1"),
      await creerJeune(ctx, "2"),
      await creerJeune(ctx, "3"),
    ];
    for (const j of jeunes)
      await signalerOpportunite(ctx, { opportuniteId: o.id, userId: j.id, motif: "Frais" });
    await supprimerUtilisateur(prisma, jeunes[0]!.id, ctx.horloge.maintenant());
    expect(await prisma.opportunite.findUniqueOrThrow({ where: { id: o.id } })).toMatchObject({
      statut: "SUSPENDUE",
      nbSignalements: 3,
    });
  });

  it("alerte le back-office si la revue humaine dépasse 48 heures", async () => {
    const { ctx, horloge } = contexteTest();
    const o = await creerOpportuniteVerifiee(prisma);
    for (const id of ["1", "2", "3"]) {
      const j = await creerJeune(ctx, id);
      await signalerOpportunite(ctx, { opportuniteId: o.id, userId: j.id, motif: "Frais" });
    }
    horloge.avancer(47 * 3600_000);
    expect(await alertesRevueEnRetard(prisma, horloge.maintenant())).toHaveLength(0);
    horloge.avancer(2 * 3600_000);
    expect(await alertesRevueEnRetard(prisma, horloge.maintenant())).toHaveLength(1);

    const admin = await prisma.adminUser.create({
      data: { email: "c@x.org", motDePasseHache: "x", role: "CURATEUR" },
    });
    await traiterSignalements(ctx, { opportuniteId: o.id, decision: "REJETE", adminId: admin.id });
    expect(await prisma.opportunite.findUniqueOrThrow({ where: { id: o.id } })).toMatchObject({
      statut: "VERIFIEE",
      nbSignalements: 0,
    });
    expect(await alertesRevueEnRetard(prisma, horloge.maintenant())).toHaveLength(0);
  });
});

describe("RG-04 : péremption", () => {
  it("passe à A_VERIFIER les fiches vérifiées depuis plus de 6 mois", async () => {
    const { ctx } = contexteTest();
    await prisma.programme.update({
      where: { id: "bj-azoli" },
      data: { statut: "VERIFIEE", verifieLe: new Date("2026-04-01") },
    });
    await prisma.metier.update({
      where: { id: "bj-vente" },
      data: { statut: "VERIFIEE", verifieLe: new Date("2026-10-01") },
    });
    const o = await creerOpportuniteVerifiee(prisma, { verifieLe: new Date("2026-01-15") });

    const r = await marquerFichesPerimees(prisma, ctx.horloge.maintenant());
    expect(r).toMatchObject({ programmes: 1, metiers: 0, opportunites: 1 });
    expect((await prisma.programme.findUniqueOrThrow({ where: { id: "bj-azoli" } })).statut).toBe(
      "A_VERIFIER",
    );
    expect((await prisma.metier.findUniqueOrThrow({ where: { id: "bj-vente" } })).statut).toBe(
      "VERIFIEE",
    );
    expect((await prisma.opportunite.findUniqueOrThrow({ where: { id: o.id } })).statut).toBe(
      "A_VERIFIER",
    );
  });
});

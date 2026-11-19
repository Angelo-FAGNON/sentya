// Le seed est rejoué à chaque "docker compose up" : il ne doit jamais écraser le travail
// d'un curateur ni le compte administrateur.
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prismaTest, viderBase } from "../outils/base";

const prisma = prismaTest();
const dossierDb = fileURLToPath(new URL("../../../db", import.meta.url));
const seeder = () =>
  execSync("pnpm exec prisma db seed", {
    cwd: dossierDb,
    env: {
      ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      ADMIN_EMAIL: "admin@seed.test",
      ADMIN_PASSWORD: "mot-de-passe-de-test-123",
    },
    stdio: "pipe",
  });

beforeAll(async () => {
  await viderBase();
  seeder();
}, 120_000);
afterAll(async () => {
  await viderBase();
  await prisma.$disconnect();
});

describe("seed de démonstration", () => {
  it("crée un référentiel complet, sans opportunité, avec un administrateur", async () => {
    expect(await prisma.competence.count()).toBeGreaterThanOrEqual(80);
    expect(await prisma.metier.count({ where: { pays: "BJ" } })).toBeGreaterThanOrEqual(20);
    expect(await prisma.metier.count({ where: { pays: "TG" } })).toBeGreaterThanOrEqual(20);
    expect(await prisma.modeleEtape.count()).toBe((await prisma.metier.count()) * 9);
    expect(await prisma.opportunite.count()).toBe(0);
    expect(await prisma.metier.count({ where: { statut: { not: "A_VERIFIER" } } })).toBe(0);
    const programmes = await prisma.programme.findMany();
    expect(programmes.every((p) => p.contact === "À vérifier par le curateur")).toBe(true);
    expect(
      await prisma.adminUser.findUniqueOrThrow({ where: { email: "admin@seed.test" } }),
    ).toMatchObject({
      role: "ADMIN",
      totpActive: false,
    });
  });

  it("conserve les modifications d'un curateur et l'administrateur au second passage", async () => {
    const programme = await prisma.programme.findFirstOrThrow({ orderBy: { id: "asc" } });
    const verifieLe = new Date("2026-11-18T10:00:00Z");
    await prisma.programme.update({
      where: { id: programme.id },
      data: { contact: "Guichet officiel, vérifié par le curateur", statut: "VERIFIEE", verifieLe },
    });
    const admin = await prisma.adminUser.update({
      where: { email: "admin@seed.test" },
      data: { totpActive: true, totpSecret: "v1.secret-chiffre" },
    });

    seeder();

    expect(await prisma.programme.findUniqueOrThrow({ where: { id: programme.id } })).toMatchObject(
      {
        contact: "Guichet officiel, vérifié par le curateur",
        statut: "VERIFIEE",
        verifieLe,
      },
    );
    expect(
      await prisma.adminUser.findUniqueOrThrow({ where: { email: "admin@seed.test" } }),
    ).toMatchObject({
      motDePasseHache: admin.motDePasseHache,
      totpActive: true,
    });
  });
});

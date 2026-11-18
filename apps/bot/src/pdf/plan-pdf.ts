// EF-07 : export du plan en PDF simple (polices standard, aucune image : quelques Ko).
import PDFDocument from "pdfkit";
import { formaterDate, fr, mentionSource, STATUT_ETAPE_LIBELLE, VOIE_LIBELLE } from "@sentya/core";
import type { PrismaClient } from "@sentya/db";

export function generateurPdfPlan(prisma: PrismaClient) {
  return async (planId: string): Promise<Buffer> => {
    const plan = await prisma.plan.findUniqueOrThrow({
      where: { id: planId },
      include: { etapes: { orderBy: { ordre: "asc" } }, piste: { include: { metier: true } } },
    });

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: { Title: fr.pdf.titre, Author: "Sentya" },
    });
    const morceaux: Buffer[] = [];
    doc.on("data", (m: Buffer) => morceaux.push(m));
    const fin = new Promise<Buffer>((resoudre) =>
      doc.on("end", () => resoudre(Buffer.concat(morceaux))),
    );

    doc.font("Helvetica-Bold").fontSize(20).text(fr.pdf.titre);
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(12)
      .text(fr.pdf.pisteChoisie(plan.piste.metier.libelle, VOIE_LIBELLE[plan.piste.voie]));
    doc.text(fr.pdf.creeLe(formaterDate(plan.createdAt)));
    doc.moveDown();

    for (const etape of plan.etapes) {
      doc.font("Helvetica-Bold").fontSize(14).text(fr.pdf.etapeTitre(etape.ordre, etape.titre));
      doc.font("Helvetica").fontSize(11).text(etape.details);
      doc.text(fr.pdf.echeance(formaterDate(etape.echeance)));
      doc.text(fr.pdf.statutEtape(STATUT_ETAPE_LIBELLE[etape.statut]));
      doc
        .fillColor("#444444")
        .text(
          mentionSource({
            sourceUrl: etape.sourceUrl,
            verifieLe: etape.verifieLe,
            statut: etape.verifieLe ? "VERIFIEE" : "A_VERIFIER",
          }),
        )
        .fillColor("#000000");
      doc.moveDown();
    }

    doc.moveDown();
    doc.fontSize(10).fillColor("#444444").text(fr.pdf.piedDePage);
    doc.end();
    return fin;
  };
}

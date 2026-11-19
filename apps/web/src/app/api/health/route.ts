// Sonde de santé : la base répond-elle à SELECT 1 ?
import { getPrisma } from "@sentya/db";
import { journalWeb } from "@/lib/contexte";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", base: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erreur) {
    journalWeb().error({ err: erreur }, "sonde de sante : base injoignable");
    return Response.json(
      { status: "erreur", base: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

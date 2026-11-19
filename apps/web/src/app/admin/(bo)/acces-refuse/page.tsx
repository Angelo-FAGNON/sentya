import type { Metadata } from "next";
import { EnTete } from "@/composants/admin";
import { exigerAdmin } from "@/lib/garde";

export const metadata: Metadata = { title: "Accès refusé" };

export default async function AccesRefuse() {
  await exigerAdmin("tableau");
  return (
    <>
      <EnTete titre="Accès refusé" />
      <p>Ton rôle ne permet pas d&apos;ouvrir cette page. Demande à un administrateur si besoin.</p>
      <p className="mt-4">
        <a href="/admin">Retour au tableau de bord</a>
      </p>
    </>
  );
}

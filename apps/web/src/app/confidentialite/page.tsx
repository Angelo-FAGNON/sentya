import type { Metadata } from "next";
import { PageTexte } from "@/composants/cadre-public";
import { confidentialite } from "@/lib/textes-publics";

export const metadata: Metadata = { title: confidentialite.titre };

export default function Page() {
  return <PageTexte {...confidentialite} />;
}

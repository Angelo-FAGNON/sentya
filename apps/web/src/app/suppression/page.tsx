import type { Metadata } from "next";
import { PageTexte } from "@/composants/cadre-public";
import { suppression } from "@/lib/textes-publics";

export const metadata: Metadata = { title: suppression.titre };

export default function Page() {
  return <PageTexte {...suppression} />;
}

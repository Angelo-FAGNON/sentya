import type { Metadata } from "next";
import { PageTexte } from "@/composants/cadre-public";
import { conditions } from "@/lib/textes-publics";

export const metadata: Metadata = { title: conditions.titre };

export default function Page() {
  return <PageTexte {...conditions} />;
}

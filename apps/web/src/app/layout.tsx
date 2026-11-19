import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";
import "./site-public.css";

export const metadata: Metadata = {
  title: { default: "Sentya", template: "%s | Sentya" },
  description:
    "Sentya, ton conseiller d'orientation gratuit dans ta messagerie, au Bénin et au Togo. Sur Telegram, bientôt sur WhatsApp.",
};

// Pas de maximum-scale : le zoom reste toujours possible.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Lire les en-têtes rend chaque page dynamique : indispensable au nonce de la CSP.
  await headers();
  return (
    <html lang="fr">
      <body>
        <a href="#contenu" className="lien-evitement">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}

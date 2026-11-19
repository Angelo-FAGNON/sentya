"use client";
// En-tête des pages publiques : la barre devient une pilule flottante au défilement,
// et le lien de la section visible est mis en avant (page d'accueil seulement).
import { useEffect, useState } from "react";
import { Icone } from "./icones";

export interface LienNavigation {
  ancre: string;
  libelle: string;
}

export function EntetePublic({
  lienBot,
  navigation,
  canaux,
  boutonCourt,
  bouton,
}: {
  lienBot: string;
  navigation: LienNavigation[];
  canaux: string;
  boutonCourt: string;
  bouton: string;
}) {
  const [defile, setDefile] = useState(false);
  const [actif, setActif] = useState<string | null>(null);

  useEffect(() => {
    const maj = () => setDefile(window.scrollY > 8);
    maj();
    window.addEventListener("scroll", maj, { passive: true });
    return () => window.removeEventListener("scroll", maj);
  }, []);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const sections = navigation
      .map((lien) => ({ ancre: lien.ancre, section: document.getElementById(lien.ancre)?.closest("section") }))
      .filter((s): s is { ancre: string; section: HTMLElement } => !!s.section);
    if (sections.length === 0) return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          const ancre = sections.find((s) => s.section === entree.target)?.ancre ?? null;
          if (entree.isIntersecting) setActif(ancre);
          else setActif((courant) => (courant === ancre ? null : courant));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => observateur.observe(s.section));
    return () => observateur.disconnect();
  }, [navigation]);

  return (
    <header className={defile ? "entete defile" : "entete"}>
      <div className="conteneur">
        <div className="barre-nav">
          <a href="/" className="marque" aria-label="Sentya, accueil">
            <Icone nom="marque" />
            Sentya
          </a>
          <nav aria-label="Navigation principale">
            <ul className="liens-nav">
              {navigation.map((lien) => (
                <li key={lien.ancre}>
                  <a href={`/#${lien.ancre}`} aria-current={actif === lien.ancre ? "true" : undefined}>
                    {lien.libelle}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="droite-nav">
            <span className="canaux">
              <span className="point" aria-hidden="true" />
              {canaux}
            </span>
            <a className="cta cta-petit" href={lienBot} rel="noopener" aria-label={bouton}>
              <Icone nom="avion" />
              {boutonCourt}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

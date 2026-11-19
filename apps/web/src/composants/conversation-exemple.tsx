"use client";
// Conversation d'exemple de la page d'accueil, jouée une fois quand elle devient visible.
// Sans JavaScript, ou si le mouvement est réduit, la conversation complète reste affichée.
import { useCallback, useEffect, useRef, useState } from "react";
import type { conversationExemple } from "@/lib/textes-publics";
import { Icone } from "./icones";

type Message = (typeof conversationExemple)[number];

type Element =
  | { type: "msg"; message: Message }
  | { type: "touches"; message: Message }
  | { type: "ecrit" };

/** Attente avant chaque élément, en millisecondes. */
const RYTHME = [500, 1400, 900, 350, 1100, 300, 1500, 350];

function aplatir(messages: Message[]): Element[] {
  const elements: Element[] = [];
  messages.forEach((message, index) => {
    // L'indicateur de saisie précède la dernière réponse du bot (les pistes).
    if (index === messages.length - 1 && message.de === "bot") elements.push({ type: "ecrit" });
    elements.push({ type: "msg", message });
    if (message.touches) elements.push({ type: "touches", message });
  });
  return elements;
}

export function ConversationExemple({
  messages,
  textes,
}: {
  messages: Message[];
  textes: { entete: string; legende: string; rejouer: string; saisie: string };
}) {
  const elements = aplatir(messages);
  const total = elements.length;

  // Rendu serveur : tout est visible. Le client prend la main au montage.
  const [visibles, setVisibles] = useState(total);
  const [anime, setAnime] = useState(false);
  const [fini, setFini] = useState(false);
  const fil = useRef<HTMLDivElement>(null);
  const minuteurs = useRef<number[]>([]);

  const arreter = () => {
    minuteurs.current.forEach((id) => window.clearTimeout(id));
    minuteurs.current = [];
  };

  const jouer = useCallback(() => {
    arreter();
    setAnime(true);
    setFini(false);
    setVisibles(0);
    let t = 0;
    for (let i = 0; i < total; i += 1) {
      t += RYTHME[i] ?? 600;
      minuteurs.current.push(window.setTimeout(() => setVisibles(i + 1), t));
    }
    minuteurs.current.push(window.setTimeout(() => setFini(true), t + 600));
  }, [total]);

  useEffect(() => {
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cible = fil.current;
    if (calme || !cible || !("IntersectionObserver" in window)) return;

    setAnime(true);
    setVisibles(0);
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees[0]?.isIntersecting) {
          observateur.disconnect();
          jouer();
        }
      },
      { threshold: 0.35 },
    );
    observateur.observe(cible);
    return () => {
      observateur.disconnect();
      arreter();
    };
  }, [jouer]);

  const montre = (i: Element, index: number) => {
    if (i.type === "ecrit") {
      // Visible seulement entre son apparition et le message suivant.
      return anime && visibles === index + 1;
    }
    return index < visibles;
  };

  return (
    <figure className="scene" aria-labelledby="legende-exemple">
      <div className="telephone">
        <div className={anime ? "ecran anime" : "ecran"}>
          <div className="barre-tg" aria-hidden="true">
            <Icone nom="marque" />
            <div>
              <strong>Sentya</strong>
              <span>{textes.entete}</span>
            </div>
          </div>
          <div className="fil" ref={fil}>
            {elements.map((element, index) => {
              if (!montre(element, index)) return null;
              const classeEntree = anime ? " entre" : "";
              if (element.type === "ecrit") {
                return (
                  <div key="ecrit" className={`ecrit${classeEntree}`} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                );
              }
              if (element.type === "touches") {
                const colonnes = element.message.colonnes === 2 ? " touches-2" : "";
                return (
                  <div key={`t${index}`} className={`touches${colonnes}${classeEntree}`} aria-hidden="true">
                    {element.message.touches?.map((touche) => (
                      <span key={touche.libelle} className={touche.appuye ? "appuye" : undefined}>
                        {touche.libelle}
                      </span>
                    ))}
                  </div>
                );
              }
              return (
                <div key={`m${index}`} className={`msg ${element.message.de}${classeEntree}`}>
                  {element.message.texte}
                  <time>{element.message.heure}</time>
                </div>
              );
            })}
          </div>
          <div className="saisie" aria-hidden="true">
            <span>{textes.saisie}</span>
            <Icone nom="micro" />
          </div>
        </div>
      </div>
      <figcaption className="legende">
        <span id="legende-exemple">{textes.legende}</span>
        {fini ? (
          <button type="button" className="rejouer" onClick={jouer}>
            <Icone nom="rejouer" />
            {textes.rejouer}
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}

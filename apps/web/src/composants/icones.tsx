// Icônes du site public : un seul sprite SVG inline (aucun fichier à télécharger),
// trait de 2 px. Pas d'attribut style : la CSP n'autorise pas les styles en ligne.
import { Fragment } from "react";

const SYMBOLES = {
  marque: (
    <symbol id="i-marque" viewBox="0 0 40 40">
      <rect width="40" height="40" rx="11" fill="#0b1733" />
      <path
        d="M10 29 C 15 29, 15 20, 20 20 S 25 11, 30 11"
        fill="none"
        stroke="#ffc83d"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="0.1 5.4"
      />
      <circle cx="10" cy="29" r="3.4" fill="#ffffff" />
      <circle cx="20" cy="20" r="3.4" fill="#ffffff" />
      <circle cx="30" cy="11" r="4.2" fill="#ffc83d" />
    </symbol>
  ),
  avion: (
    <symbol id="i-avion" viewBox="0 0 24 24">
      <path
        d="M21.2 3.3 2.9 10.4c-.9.4-.9 1.6 0 1.9l4.6 1.6 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.5 4.6 3.4c.6.4 1.4.1 1.6-.6l3.1-15c.2-.9-.7-1.6-1.6-1.3Z"
        fill="currentColor"
      />
      <path
        d="m8 13.6 9.6-6.3-7.3 7.7"
        fill="none"
        stroke="#fff"
        strokeOpacity=".55"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
  coche: (
    <symbol id="i-coche" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity=".14" />
      <path
        d="m7.5 12.3 3 3 6-6.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
  micro: (
    <symbol id="i-micro" viewBox="0 0 24 24">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </symbol>
  ),
  source: (
    <symbol id="i-source" viewBox="0 0 24 24">
      <path d="M6 3h8l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M14 3v4h4M9 15l2 2 4-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
  cloche: (
    <symbol id="i-cloche" viewBox="0 0 24 24">
      <path
        d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
  horloge: (
    <symbol id="i-horloge" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5V12l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
  personne: (
    <symbol id="i-personne" viewBox="0 0 40 40">
      <circle cx="20" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M8 33c1.6-6.2 6.2-9.5 12-9.5s10.4 3.3 12 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </symbol>
  ),
  verifie: (
    <symbol id="i-verifie" viewBox="0 0 40 40">
      <path d="M11 6h13l6 6v22H11z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d="M24 6v6h6M15.5 23.5l3.2 3.2 6.3-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
  cadenas: (
    <symbol id="i-cadenas" viewBox="0 0 40 40">
      <rect x="9" y="17" width="22" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M14 17v-4a6 6 0 0 1 12 0v4M20 23.5v3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </symbol>
  ),
  alerte: (
    <symbol id="i-alerte" viewBox="0 0 40 40">
      <path d="M20 6 34 31H6z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path
        d="M20 16v7M20 27.2v.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </symbol>
  ),
  plus: (
    <symbol id="i-plus" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </symbol>
  ),
  rejouer: (
    <symbol id="i-rejouer" viewBox="0 0 24 24">
      <path
        d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </symbol>
  ),
};

export type NomIcone = keyof typeof SYMBOLES;

/** Sprite à placer une fois par page, avant toute icône. */
export function SpriteIcones() {
  return (
    <svg className="sprite-icones" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(SYMBOLES).map(([nom, symbole]) => (
          <Fragment key={nom}>{symbole}</Fragment>
        ))}
      </defs>
    </svg>
  );
}

/** Icône décorative : le texte voisin porte toujours le sens. */
export function Icone({ nom, className }: { nom: NomIcone; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#i-${nom}`} />
    </svg>
  );
}

"use client";
// Formulaires accessibles : chaque champ a une étiquette, les erreurs sont annoncées
// (zone aria-live) et reliées au champ (aria-describedby, aria-invalid).
// Avec JavaScript, la saisie est conservée en cas d'erreur. Sans JavaScript, le formulaire
// est envoyé normalement (amélioration progressive des Server Actions).
import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useId,
  type FormEvent,
  type ReactNode,
} from "react";
import { ETAT_INITIAL, type EtatFormulaire } from "@/lib/etat-formulaire";

type ActionFormulaire = (etat: EtatFormulaire, donnees: FormData) => Promise<EtatFormulaire>;

const ContexteErreurs = createContext<Record<string, string>>({});

export function Formulaire({
  action,
  children,
  libelleBouton,
  libelleEnCours = "Envoi en cours...",
  varianteBouton = "bouton",
  className = "space-y-5",
}: {
  action: ActionFormulaire;
  children?: ReactNode;
  libelleBouton: string;
  libelleEnCours?: string;
  varianteBouton?: "bouton" | "bouton-secondaire" | "bouton-danger";
  className?: string;
}) {
  const [etat, executer, enCours] = useActionState(action, ETAT_INITIAL);

  function envoyer(evenement: FormEvent<HTMLFormElement>) {
    // On envoie nous-mêmes les données : React ne vide alors pas les champs après l'action.
    evenement.preventDefault();
    const formulaire = evenement.currentTarget;
    const soumetteur = (evenement.nativeEvent as SubmitEvent).submitter;
    const donnees = new FormData(formulaire, soumetteur);
    startTransition(() => executer(donnees));
  }

  const champs = etat.statut === "erreur" ? etat.champs : {};
  const erreurGlobale = etat.statut === "erreur" ? etat.message : null;
  const succes = etat.statut === "succes" ? etat.message : null;

  return (
    <ContexteErreurs.Provider value={champs}>
      <form action={executer} onSubmit={envoyer} className={className} noValidate>
        <div aria-live="assertive" role="alert" className="empty:hidden">
          {erreurGlobale ? (
            <p className="rounded border-l-4 border-red-700 bg-red-50 p-3 font-semibold text-red-900">
              {erreurGlobale}
            </p>
          ) : null}
        </div>
        <div aria-live="polite" role="status" className="empty:hidden">
          {succes ? (
            <p className="rounded border-l-4 border-emerald-700 bg-emerald-50 p-3 font-semibold text-emerald-900">
              {succes}
            </p>
          ) : null}
        </div>
        {children}
        <div>
          <button type="submit" className={varianteBouton} disabled={enCours}>
            {enCours ? libelleEnCours : libelleBouton}
          </button>
        </div>
      </form>
    </ContexteErreurs.Provider>
  );
}

/** Erreurs et aide d'un champ : identifiants pour aria-describedby. */
function useChamp(nom: string, aide?: string) {
  const erreurs = useContext(ContexteErreurs);
  const id = useId();
  const erreur = erreurs[nom];
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decritPar = [idAide, idErreur].filter(Boolean).join(" ") || undefined;
  return { id, erreur, idAide, idErreur, decritPar };
}

function AideEtErreur({
  aide,
  idAide,
  erreur,
  idErreur,
}: {
  aide?: string;
  idAide?: string;
  erreur?: string;
  idErreur?: string;
}) {
  return (
    <>
      {aide ? (
        <p id={idAide} className="mt-1 text-sm text-slate-700">
          {aide}
        </p>
      ) : null}
      {erreur ? (
        <p id={idErreur} className="mt-1 text-sm font-semibold text-red-800">
          {erreur}
        </p>
      ) : null}
    </>
  );
}

function Etiquette({ htmlFor, libelle, requis }: { htmlFor: string; libelle: string; requis?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block font-semibold">
      {libelle}
      {requis ? <span className="font-normal text-slate-700"> (obligatoire)</span> : null}
    </label>
  );
}

export function Champ({
  nom,
  libelle,
  type = "text",
  valeur,
  requis,
  aide,
  autoComplete,
  inputMode,
  min,
  max,
  className,
}: {
  nom: string;
  libelle: string;
  type?: "text" | "email" | "password" | "url" | "date" | "number" | "tel";
  valeur?: string | number | null;
  requis?: boolean;
  aide?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "email" | "url";
  min?: number;
  max?: number;
  className?: string;
}) {
  const { id, erreur, idAide, idErreur, decritPar } = useChamp(nom, aide);
  return (
    <div className={className}>
      <Etiquette htmlFor={id} libelle={libelle} requis={requis} />
      <input
        id={id}
        name={nom}
        type={type}
        defaultValue={valeur ?? undefined}
        required={requis}
        aria-required={requis || undefined}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar}
        autoComplete={autoComplete}
        inputMode={inputMode}
        min={min}
        max={max}
        className="champ"
      />
      <AideEtErreur aide={aide} idAide={idAide} erreur={erreur} idErreur={idErreur} />
    </div>
  );
}

export function ZoneTexte({
  nom,
  libelle,
  valeur,
  requis,
  aide,
  lignes = 4,
}: {
  nom: string;
  libelle: string;
  valeur?: string | null;
  requis?: boolean;
  aide?: string;
  lignes?: number;
}) {
  const { id, erreur, idAide, idErreur, decritPar } = useChamp(nom, aide);
  return (
    <div>
      <Etiquette htmlFor={id} libelle={libelle} requis={requis} />
      <textarea
        id={id}
        name={nom}
        rows={lignes}
        defaultValue={valeur ?? undefined}
        required={requis}
        aria-required={requis || undefined}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar}
        className="champ"
      />
      <AideEtErreur aide={aide} idAide={idAide} erreur={erreur} idErreur={idErreur} />
    </div>
  );
}

export interface Option {
  valeur: string;
  libelle: string;
}

export function Liste({
  nom,
  libelle,
  options,
  valeur,
  requis,
  aide,
  optionVide,
}: {
  nom: string;
  libelle: string;
  options: Option[];
  valeur?: string | null;
  requis?: boolean;
  aide?: string;
  /** Libellé d'une première option vide (choix facultatif). */
  optionVide?: string;
}) {
  const { id, erreur, idAide, idErreur, decritPar } = useChamp(nom, aide);
  return (
    <div>
      <Etiquette htmlFor={id} libelle={libelle} requis={requis} />
      <select
        id={id}
        name={nom}
        defaultValue={valeur ?? ""}
        required={requis}
        aria-required={requis || undefined}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar}
        className="champ"
      >
        {optionVide !== undefined ? <option value="">{optionVide}</option> : null}
        {options.map((option) => (
          <option key={option.valeur} value={option.valeur}>
            {option.libelle}
          </option>
        ))}
      </select>
      <AideEtErreur aide={aide} idAide={idAide} erreur={erreur} idErreur={idErreur} />
    </div>
  );
}

export function CaseACocher({
  nom,
  libelle,
  coche,
  aide,
}: {
  nom: string;
  libelle: string;
  coche?: boolean;
  aide?: string;
}) {
  const { id, erreur, idAide, idErreur, decritPar } = useChamp(nom, aide);
  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id={id}
          name={nom}
          type="checkbox"
          defaultChecked={coche}
          aria-describedby={decritPar}
          aria-invalid={erreur ? true : undefined}
          className="mt-1 h-5 w-5"
        />
        <label htmlFor={id} className="font-semibold">
          {libelle}
        </label>
      </div>
      <AideEtErreur aide={aide} idAide={idAide} erreur={erreur} idErreur={idErreur} />
    </div>
  );
}

/** Groupe de cases (choix multiple) ou de boutons radio (choix unique), dans un fieldset. */
export function Groupe({
  nom,
  legende,
  options,
  valeurs = [],
  type = "checkbox",
  requis,
  aide,
}: {
  nom: string;
  legende: string;
  options: Option[];
  valeurs?: string[];
  type?: "checkbox" | "radio";
  requis?: boolean;
  aide?: string;
}) {
  const { id, erreur, idAide, idErreur, decritPar } = useChamp(nom, aide);
  return (
    <fieldset aria-describedby={decritPar} aria-invalid={erreur ? true : undefined}>
      <legend className="font-semibold">
        {legende}
        {requis ? <span className="font-normal text-slate-700"> (obligatoire)</span> : null}
      </legend>
      <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
        {options.map((option) => (
          <div key={option.valeur} className="flex items-center gap-2">
            <input
              id={`${id}-${option.valeur}`}
              name={nom}
              type={type}
              value={option.valeur}
              defaultChecked={valeurs.includes(option.valeur)}
              className="h-5 w-5"
            />
            <label htmlFor={`${id}-${option.valeur}`}>{option.libelle}</label>
          </div>
        ))}
      </div>
      <AideEtErreur aide={aide} idAide={idAide} erreur={erreur} idErreur={idErreur} />
    </fieldset>
  );
}

/** Bouton d'action seul (vérifier, valider, supprimer...) avec son message de résultat. */
export function BoutonAction({
  action,
  libelle,
  variante = "bouton-secondaire",
  champsCaches = {},
}: {
  action: ActionFormulaire;
  libelle: string;
  variante?: "bouton" | "bouton-secondaire" | "bouton-danger";
  champsCaches?: Record<string, string>;
}) {
  return (
    <Formulaire
      action={action}
      libelleBouton={libelle}
      varianteBouton={variante}
      libelleEnCours="Un instant..."
      className="space-y-2"
    >
      {Object.entries(champsCaches).map(([nom, valeur]) => (
        <input key={nom} type="hidden" name={nom} value={valeur} />
      ))}
    </Formulaire>
  );
}

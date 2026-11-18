// EF-06 : fiche d'une piste. Toutes les données viennent de la base, avec leur source.
import type { ClientBase } from "../contexte";
import { fr, VOIE_LIBELLE } from "../messages/fr";
import { STATUTS_REFERENTIEL_ELIGIBLES } from "../regles/eligibilite";
import { formaterCout, mentionSource } from "../regles/sources";

export interface FichePiste {
  pisteId: string;
  metierId: string;
  libelle: string;
  voie: keyof typeof VOIE_LIBELLE;
  description: string;
  ouExiste: string;
  sourceMetier: string;
  formations: {
    intitule: string;
    organisme: string;
    duree: string;
    cout: string;
    source: string;
  }[];
  programmes: {
    nom: string;
    description: string;
    conditions: string;
    contact: string;
    source: string;
  }[];
}

export async function construireFiche(
  prisma: ClientBase,
  pisteId: string,
): Promise<FichePiste | null> {
  const piste = await prisma.piste.findUnique({
    where: { id: pisteId },
    include: {
      metier: {
        include: {
          formations: {
            include: { formation: true },
          },
        },
      },
    },
  });
  if (!piste) return null;
  const { metier } = piste;

  const formations = metier.formations
    .map((mf) => mf.formation)
    .filter((f) => f.pays === metier.pays && STATUTS_REFERENTIEL_ELIGIBLES.includes(f.statut))
    .slice(0, 2);

  // Programmes : ceux des modèles d'étapes de cette voie, puis ceux du pays pour cette voie.
  const modeles = await prisma.modeleEtape.findMany({
    where: { metierId: metier.id, voie: piste.voie, programmeId: { not: null } },
    select: { programmeId: true },
  });
  const idsLies = [
    ...new Set(modeles.map((m) => m.programmeId).filter((id): id is string => !!id)),
  ];
  const programmes = await prisma.programme.findMany({
    where: {
      pays: metier.pays,
      statut: { in: STATUTS_REFERENTIEL_ELIGIBLES },
      OR: [{ id: { in: idsLies } }, { voies: { has: piste.voie } }],
    },
    orderBy: { nom: "asc" },
  });
  programmes.sort((a, b) => Number(idsLies.includes(b.id)) - Number(idsLies.includes(a.id)));

  return {
    pisteId: piste.id,
    metierId: metier.id,
    libelle: metier.libelle,
    voie: piste.voie,
    description: metier.description,
    ouExiste: metier.ouExiste,
    sourceMetier: mentionSource(metier),
    formations: formations.map((f) => ({
      intitule: f.intitule,
      organisme: f.organisme,
      duree: f.dureeIndicative,
      cout: formaterCout(f.coutIndicatifFcfa),
      source: mentionSource(f),
    })),
    programmes: programmes.slice(0, 2).map((p) => ({
      nom: p.nom,
      description: p.description,
      conditions: p.conditions,
      contact: p.contact,
      source: mentionSource(p),
    })),
  };
}

/** Texte de la fiche, découpé en messages courts. */
export function formaterFiche(fiche: FichePiste): string[] {
  const messages: string[] = [
    [
      fr.ficheTitre(fiche.libelle, VOIE_LIBELLE[fiche.voie]),
      fiche.description,
      fr.ficheOuExiste(fiche.ouExiste),
      fiche.sourceMetier,
    ].join("\n"),
  ];

  for (const f of fiche.formations) {
    messages.push(
      [
        `${f.intitule} (${f.organisme})`,
        fr.ficheDuree(f.duree),
        fr.ficheCout(f.cout),
        f.source,
      ].join("\n"),
    );
  }

  if (fiche.programmes.length > 0) {
    messages.push(
      [
        fr.ficheProgrammes,
        ...fiche.programmes.map((p) =>
          [
            `- ${p.nom} : ${p.description}`,
            `Conditions : ${p.conditions}`,
            `Contact : ${p.contact}`,
            p.source,
          ].join("\n"),
        ),
      ].join("\n"),
    );
  } else {
    messages.push(fr.ficheAucunProgramme);
  }

  messages.push(fr.ficheConclusion);
  return messages;
}

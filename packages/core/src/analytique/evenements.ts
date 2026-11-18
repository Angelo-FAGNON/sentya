// Événements d'analyse : aucune donnée d'identité, seulement le hachage du jeune (H3, H6).
import type { Canal, Prisma } from "@sentya/db";
import type { ClientBase } from "../contexte";

export const EVENEMENTS = {
  PROFIL_CREE: "profil_cree",
  BILAN_COMMENCE: "bilan_commence",
  BILAN_TERMINE: "bilan_termine",
  COMPETENCES_VALIDEES: "competences_validees",
  CV_IMPORTE: "cv_importe",
  PISTES_GENEREES: "pistes_generees",
  PLAN_CREE: "plan_cree",
  ETAPE_STATUT: "etape_statut",
  RAPPEL_ENVOYE: "rappel_envoye",
  SIGNALEMENT: "signalement",
  OPPORTUNITE_SUSPENDUE: "opportunite_suspendue",
  CANDIDATURE: "candidature",
  IA_INDISPONIBLE: "ia_indisponible",
  DONNEES_SENSIBLES_FILTREES: "donnees_sensibles_filtrees",
  COMPTE_SUPPRIME: "compte_supprime",
  PROFIL_ANONYMISE: "profil_anonymise",
} as const;

export type TypeEvenement = (typeof EVENEMENTS)[keyof typeof EVENEMENTS];

export async function enregistrerEvenement(
  prisma: ClientBase,
  evenement: {
    type: TypeEvenement;
    userHash?: string | null;
    canal?: Canal | null;
    payload?: Prisma.InputJsonValue;
    date?: Date;
  },
): Promise<void> {
  await prisma.evenementAnalytique.create({
    data: {
      type: evenement.type,
      userHash: evenement.userHash ?? null,
      canal: evenement.canal ?? null,
      payload: evenement.payload ?? {},
      createdAt: evenement.date,
    },
  });
}

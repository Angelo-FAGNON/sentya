-- CreateEnum
CREATE TYPE "Pays" AS ENUM ('BJ', 'TG');

-- CreateEnum
CREATE TYPE "Statut" AS ENUM ('BROUILLON', 'VERIFIEE', 'A_VERIFIER', 'SUSPENDUE');

-- CreateEnum
CREATE TYPE "Voie" AS ENUM ('EMPLOI', 'FORMATION_CERTIFICATION', 'AUTO_EMPLOI');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXTE', 'VOCAL', 'CV');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('TELEGRAM', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NiveauEtudes" AS ENUM ('AUCUN_DIPLOME', 'PRIMAIRE', 'SECONDAIRE', 'BAC', 'CERTIFICAT_PRO', 'SUPERIEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "Objectif" AS ENUM ('EMPLOI', 'FORMATION', 'PROPRE_ACTIVITE', 'NE_SAIT_PAS');

-- CreateEnum
CREATE TYPE "OrigineCompetence" AS ENUM ('BILAN', 'CV', 'CORRECTION');

-- CreateEnum
CREATE TYPE "EtapeStatut" AS ENUM ('A_FAIRE', 'FAIT', 'BLOQUE', 'ABANDONNE');

-- CreateEnum
CREATE TYPE "TypeRappel" AS ENUM ('J3', 'J7', 'J30');

-- CreateEnum
CREATE TYPE "TypePartenaire" AS ENUM ('CENTRE_FORMATION', 'EMPLOYEUR');

-- CreateEnum
CREATE TYPE "StatutValidation" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REFUSE');

-- CreateEnum
CREATE TYPE "CandidatureStatut" AS ENUM ('ENVOYEE', 'VUE', 'RETENUE', 'NON_RETENUE');

-- CreateEnum
CREATE TYPE "DecisionSignalement" AS ENUM ('FRAUDE_CONFIRMEE', 'REJETE');

-- CreateEnum
CREATE TYPE "TypeMotif" AS ENUM ('MOT_CLE', 'REGEX');

-- CreateEnum
CREATE TYPE "CategorieFraude" AS ENUM ('FRAIS_CANDIDAT', 'PAIEMENT_ENTRETIEN', 'WHATSAPP_SEUL', 'SALAIRE_IRREALISTE', 'AUTRE');

-- CreateEnum
CREATE TYPE "RoleAdmin" AS ENUM ('ADMIN', 'CURATEUR');

-- CreateEnum
CREATE TYPE "TypeActeur" AS ENUM ('ADMIN', 'PARTENAIRE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT,
    "userHash" TEXT NOT NULL,
    "canal" "Canal" NOT NULL DEFAULT 'TELEGRAM',
    "sourceAcquisition" TEXT,
    "prenom" TEXT,
    "pays" "Pays" NOT NULL,
    "ville" TEXT,
    "niveauEtudes" "NiveauEtudes",
    "objectif" "Objectif",
    "consentAt" TIMESTAMP(3) NOT NULL,
    "ageConfirmed" BOOLEAN NOT NULL,
    "audioReplies" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anonymiseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationState" (
    "userId" TEXT NOT NULL,
    "etape" TEXT NOT NULL,
    "donnees" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BilanReponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BilanReponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competence" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "synonymes" TEXT[],
    "domaine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCompetence" (
    "userId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "origine" "OrigineCompetence" NOT NULL,
    "validee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCompetence_pkey" PRIMARY KEY ("userId","competenceId")
);

-- CreateTable
CREATE TABLE "Metier" (
    "id" TEXT NOT NULL,
    "pays" "Pays" NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ouExiste" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "verifieLe" TIMESTAMP(3),
    "statut" "Statut" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetierCompetence" (
    "metierId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "poids" INTEGER NOT NULL,

    CONSTRAINT "MetierCompetence_pkey" PRIMARY KEY ("metierId","competenceId")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "pays" "Pays" NOT NULL,
    "intitule" TEXT NOT NULL,
    "organisme" TEXT NOT NULL,
    "dureeIndicative" TEXT NOT NULL,
    "coutIndicatifFcfa" INTEGER,
    "sourceUrl" TEXT NOT NULL,
    "verifieLe" TIMESTAMP(3),
    "statut" "Statut" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetierFormation" (
    "metierId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,

    CONSTRAINT "MetierFormation_pkey" PRIMARY KEY ("metierId","formationId")
);

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "pays" "Pays" NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publicCible" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "voies" "Voie"[],
    "sourceUrl" TEXT NOT NULL,
    "verifieLe" TIMESTAMP(3),
    "statut" "Statut" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeleEtape" (
    "id" TEXT NOT NULL,
    "metierId" TEXT NOT NULL,
    "voie" "Voie" NOT NULL,
    "ordre" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "delaiJours" INTEGER NOT NULL,
    "programmeId" TEXT,
    "formationId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "verifieLe" TIMESTAMP(3),
    "statut" "Statut" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeleEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Piste" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "metierId" TEXT NOT NULL,
    "voie" "Voie" NOT NULL,
    "raison" TEXT NOT NULL,
    "conditionPrincipale" TEXT NOT NULL,
    "aExplorer" BOOLEAN NOT NULL DEFAULT false,
    "choisie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Piste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pisteId" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanEtape" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "echeance" TIMESTAMP(3) NOT NULL,
    "statut" "EtapeStatut" NOT NULL DEFAULT 'A_FAIRE',
    "raison" TEXT,
    "statutMajLe" TIMESTAMP(3),
    "modeleEtapeId" TEXT,
    "programmeId" TEXT,
    "formationId" TEXT,
    "opportuniteId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "verifieLe" TIMESTAMP(3),

    CONSTRAINT "PlanEtape_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rappel" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "type" "TypeRappel" NOT NULL,
    "prevuLe" TIMESTAMP(3) NOT NULL,
    "envoyeLe" TIMESTAMP(3),
    "jobId" TEXT,

    CONSTRAINT "Rappel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL,
    "type" "TypePartenaire" NOT NULL,
    "nom" TEXT NOT NULL,
    "pays" "Pays" NOT NULL,
    "contactOfficiel" TEXT NOT NULL,
    "statutValidation" "StatutValidation" NOT NULL DEFAULT 'EN_ATTENTE',
    "valideLe" TIMESTAMP(3),
    "valideParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartenaireCompte" (
    "id" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHache" TEXT NOT NULL,
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartenaireCompte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunite" (
    "id" TEXT NOT NULL,
    "partenaireId" TEXT,
    "pays" "Pays" NOT NULL,
    "metierId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "verifieLe" TIMESTAMP(3),
    "statut" "Statut" NOT NULL DEFAULT 'BROUILLON',
    "nbSignalements" INTEGER NOT NULL DEFAULT 0,
    "suspendueLe" TIMESTAMP(3),
    "revueLe" TIMESTAMP(3),
    "alerteFraude" BOOLEAN NOT NULL DEFAULT false,
    "motifsAlerte" TEXT[],
    "dateLimite" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signalement" (
    "id" TEXT NOT NULL,
    "opportuniteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite" BOOLEAN NOT NULL DEFAULT false,
    "decision" "DecisionSignalement",
    "traiteLe" TIMESTAMP(3),
    "traiteParId" TEXT,

    CONSTRAINT "Signalement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportuniteId" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "statut" "CandidatureStatut" NOT NULL DEFAULT 'ENVOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegleFraude" (
    "id" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "typeMotif" "TypeMotif" NOT NULL DEFAULT 'MOT_CLE',
    "categorie" "CategorieFraude" NOT NULL,
    "description" TEXT NOT NULL,
    "bloquante" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegleFraude_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevueQualite" (
    "id" TEXT NOT NULL,
    "semaine" TEXT NOT NULL,
    "userHash" TEXT,
    "conversationAnonymisee" JSONB NOT NULL,
    "recommandationId" TEXT,
    "pistesCorrectes" BOOLEAN,
    "inventionDetectee" BOOLEAN,
    "commentaire" TEXT,
    "relecteurId" TEXT,
    "noteeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevueQualite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommandationLog" (
    "id" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "pays" "Pays" NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "metierIdsCandidats" TEXT[],
    "metierIdsProposes" TEXT[],
    "metierIdsAExplorer" TEXT[],
    "idsRejetes" TEXT[],
    "sources" JSONB NOT NULL,
    "repliTotal" BOOLEAN NOT NULL DEFAULT false,
    "dureeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommandationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementAnalytique" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userHash" TEXT,
    "canal" "Canal",
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementAnalytique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedUpdate" (
    "updateId" BIGINT NOT NULL,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedUpdate_pkey" PRIMARY KEY ("updateId")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHache" TEXT NOT NULL,
    "totpSecret" TEXT,
    "totpActive" BOOLEAN NOT NULL DEFAULT false,
    "role" "RoleAdmin" NOT NULL DEFAULT 'CURATEUR',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniereConnexion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAcces" (
    "id" TEXT NOT NULL,
    "acteurType" "TypeActeur" NOT NULL,
    "acteurId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ressource" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAcces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_userHash_key" ON "User"("userHash");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE INDEX "BilanReponse_userId_createdAt_idx" ON "BilanReponse"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Competence_domaine_idx" ON "Competence"("domaine");

-- CreateIndex
CREATE INDEX "Metier_pays_statut_idx" ON "Metier"("pays", "statut");

-- CreateIndex
CREATE INDEX "Formation_pays_statut_idx" ON "Formation"("pays", "statut");

-- CreateIndex
CREATE INDEX "Programme_pays_statut_idx" ON "Programme"("pays", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "ModeleEtape_metierId_voie_ordre_key" ON "ModeleEtape"("metierId", "voie", "ordre");

-- CreateIndex
CREATE INDEX "Piste_userId_createdAt_idx" ON "Piste"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Piste_lotId_rang_key" ON "Piste"("lotId", "rang");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_pisteId_key" ON "Plan"("pisteId");

-- CreateIndex
CREATE INDEX "Plan_userId_actif_idx" ON "Plan"("userId", "actif");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEtape_planId_ordre_key" ON "PlanEtape"("planId", "ordre");

-- CreateIndex
CREATE INDEX "Rappel_prevuLe_envoyeLe_idx" ON "Rappel"("prevuLe", "envoyeLe");

-- CreateIndex
CREATE UNIQUE INDEX "Rappel_planId_type_key" ON "Rappel"("planId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PartenaireCompte_email_key" ON "PartenaireCompte"("email");

-- CreateIndex
CREATE INDEX "Opportunite_pays_statut_idx" ON "Opportunite"("pays", "statut");

-- CreateIndex
CREATE INDEX "Opportunite_statut_suspendueLe_idx" ON "Opportunite"("statut", "suspendueLe");

-- CreateIndex
CREATE INDEX "Signalement_traite_createdAt_idx" ON "Signalement"("traite", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Signalement_opportuniteId_userId_key" ON "Signalement"("opportuniteId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidature_userId_opportuniteId_key" ON "Candidature"("userId", "opportuniteId");

-- CreateIndex
CREATE INDEX "RevueQualite_semaine_idx" ON "RevueQualite"("semaine");

-- CreateIndex
CREATE INDEX "RevueQualite_userHash_idx" ON "RevueQualite"("userHash");

-- CreateIndex
CREATE UNIQUE INDEX "RecommandationLog_lotId_key" ON "RecommandationLog"("lotId");

-- CreateIndex
CREATE INDEX "RecommandationLog_userHash_idx" ON "RecommandationLog"("userHash");

-- CreateIndex
CREATE INDEX "RecommandationLog_createdAt_idx" ON "RecommandationLog"("createdAt");

-- CreateIndex
CREATE INDEX "EvenementAnalytique_type_createdAt_idx" ON "EvenementAnalytique"("type", "createdAt");

-- CreateIndex
CREATE INDEX "EvenementAnalytique_userHash_idx" ON "EvenementAnalytique"("userHash");

-- CreateIndex
CREATE INDEX "ProcessedUpdate_recuLe_idx" ON "ProcessedUpdate"("recuLe");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_tokenHash_key" ON "MagicLink"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "JournalAcces_acteurType_acteurId_createdAt_idx" ON "JournalAcces"("acteurType", "acteurId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalAcces_createdAt_idx" ON "JournalAcces"("createdAt");

-- AddForeignKey
ALTER TABLE "ConversationState" ADD CONSTRAINT "ConversationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BilanReponse" ADD CONSTRAINT "BilanReponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetence" ADD CONSTRAINT "UserCompetence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCompetence" ADD CONSTRAINT "UserCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetierCompetence" ADD CONSTRAINT "MetierCompetence_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "Metier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetierCompetence" ADD CONSTRAINT "MetierCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetierFormation" ADD CONSTRAINT "MetierFormation_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "Metier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetierFormation" ADD CONSTRAINT "MetierFormation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleEtape" ADD CONSTRAINT "ModeleEtape_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "Metier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleEtape" ADD CONSTRAINT "ModeleEtape_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeleEtape" ADD CONSTRAINT "ModeleEtape_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piste" ADD CONSTRAINT "Piste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piste" ADD CONSTRAINT "Piste_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "Metier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_pisteId_fkey" FOREIGN KEY ("pisteId") REFERENCES "Piste"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEtape" ADD CONSTRAINT "PlanEtape_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEtape" ADD CONSTRAINT "PlanEtape_modeleEtapeId_fkey" FOREIGN KEY ("modeleEtapeId") REFERENCES "ModeleEtape"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEtape" ADD CONSTRAINT "PlanEtape_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEtape" ADD CONSTRAINT "PlanEtape_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanEtape" ADD CONSTRAINT "PlanEtape_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "Opportunite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rappel" ADD CONSTRAINT "Rappel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partenaire" ADD CONSTRAINT "Partenaire_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartenaireCompte" ADD CONSTRAINT "PartenaireCompte_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "Partenaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunite" ADD CONSTRAINT "Opportunite_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "Partenaire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunite" ADD CONSTRAINT "Opportunite_metierId_fkey" FOREIGN KEY ("metierId") REFERENCES "Metier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "Opportunite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signalement" ADD CONSTRAINT "Signalement_traiteParId_fkey" FOREIGN KEY ("traiteParId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidature" ADD CONSTRAINT "Candidature_opportuniteId_fkey" FOREIGN KEY ("opportuniteId") REFERENCES "Opportunite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevueQualite" ADD CONSTRAINT "RevueQualite_relecteurId_fkey" FOREIGN KEY ("relecteurId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

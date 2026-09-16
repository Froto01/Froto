-- Company spot requirements: buyers post short-term logistics needs and providers submit private offers.
CREATE TABLE "SpotRequirement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "requirementType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "location" TEXT,
    "quantity" INTEGER NOT NULL,
    "quantityUnit" TEXT NOT NULL,
    "temperatureClass" TEXT,
    "requiredFrom" TIMESTAMP(3) NOT NULL,
    "requiredTo" TIMESTAMP(3),
    "offersCloseAt" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "awardedOfferId" TEXT,
    "awardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SpotRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SpotOffer" (
    "id" TEXT NOT NULL,
    "spotRequirementId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "serviceDescription" TEXT,
    "leadTime" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SpotOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Job" ADD COLUMN "spotRequirementId" TEXT;
ALTER TABLE "Job" ADD COLUMN "awardedSpotOfferId" TEXT;

CREATE UNIQUE INDEX "SpotRequirement_awardedOfferId_key" ON "SpotRequirement"("awardedOfferId");
CREATE INDEX "SpotRequirement_companyId_idx" ON "SpotRequirement"("companyId");
CREATE INDEX "SpotRequirement_status_idx" ON "SpotRequirement"("status");
CREATE INDEX "SpotRequirement_requirementType_idx" ON "SpotRequirement"("requirementType");
CREATE INDEX "SpotRequirement_offersCloseAt_idx" ON "SpotRequirement"("offersCloseAt");
CREATE INDEX "SpotRequirement_createdAt_idx" ON "SpotRequirement"("createdAt");

CREATE UNIQUE INDEX "SpotOffer_spotRequirementId_companyId_key" ON "SpotOffer"("spotRequirementId", "companyId");
CREATE INDEX "SpotOffer_spotRequirementId_createdAt_idx" ON "SpotOffer"("spotRequirementId", "createdAt");
CREATE INDEX "SpotOffer_companyId_idx" ON "SpotOffer"("companyId");
CREATE INDEX "SpotOffer_submittedByUserId_idx" ON "SpotOffer"("submittedByUserId");
CREATE INDEX "SpotOffer_status_idx" ON "SpotOffer"("status");

CREATE UNIQUE INDEX "Job_spotRequirementId_key" ON "Job"("spotRequirementId");
CREATE UNIQUE INDEX "Job_awardedSpotOfferId_key" ON "Job"("awardedSpotOfferId");

ALTER TABLE "SpotRequirement" ADD CONSTRAINT "SpotRequirement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotRequirement" ADD CONSTRAINT "SpotRequirement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpotRequirement" ADD CONSTRAINT "SpotRequirement_awardedOfferId_fkey" FOREIGN KEY ("awardedOfferId") REFERENCES "SpotOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpotOffer" ADD CONSTRAINT "SpotOffer_spotRequirementId_fkey" FOREIGN KEY ("spotRequirementId") REFERENCES "SpotRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SpotOffer" ADD CONSTRAINT "SpotOffer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpotOffer" ADD CONSTRAINT "SpotOffer_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_spotRequirementId_fkey" FOREIGN KEY ("spotRequirementId") REFERENCES "SpotRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_awardedSpotOfferId_fkey" FOREIGN KEY ("awardedSpotOfferId") REFERENCES "SpotOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

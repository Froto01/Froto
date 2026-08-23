CREATE TABLE "OpportunityAlertPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT,
  "name" TEXT NOT NULL DEFAULT 'My opportunities',
  "opportunityTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "areaKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "phoneE164" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpportunityAlertPreference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpportunityAlertPreference_userId_active_idx" ON "OpportunityAlertPreference"("userId", "active");
CREATE INDEX "OpportunityAlertPreference_companyId_active_idx" ON "OpportunityAlertPreference"("companyId", "active");

ALTER TABLE "OpportunityAlertPreference" ADD CONSTRAINT "OpportunityAlertPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityAlertPreference" ADD CONSTRAINT "OpportunityAlertPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

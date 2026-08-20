CREATE TABLE "Job" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "awardedBidId" TEXT NOT NULL,
  "buyerCompanyId" TEXT NOT NULL,
  "providerCompanyId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AWARDED',
  "acceptedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobEvent" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorCompanyId" TEXT,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Job_listingId_key" ON "Job"("listingId");
CREATE UNIQUE INDEX "Job_awardedBidId_key" ON "Job"("awardedBidId");
CREATE INDEX "Job_buyerCompanyId_idx" ON "Job"("buyerCompanyId");
CREATE INDEX "Job_providerCompanyId_idx" ON "Job"("providerCompanyId");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX "JobEvent_jobId_createdAt_idx" ON "JobEvent"("jobId", "createdAt");
CREATE INDEX "JobEvent_actorUserId_idx" ON "JobEvent"("actorUserId");
CREATE INDEX "JobEvent_actorCompanyId_idx" ON "JobEvent"("actorCompanyId");

ALTER TABLE "Job" ADD CONSTRAINT "Job_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_awardedBidId_fkey" FOREIGN KEY ("awardedBidId") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_providerCompanyId_fkey" FOREIGN KEY ("providerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobEvent" ADD CONSTRAINT "JobEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobEvent" ADD CONSTRAINT "JobEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobEvent" ADD CONSTRAINT "JobEvent_actorCompanyId_fkey" FOREIGN KEY ("actorCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

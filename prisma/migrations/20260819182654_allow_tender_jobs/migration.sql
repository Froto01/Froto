ALTER TABLE "Job" ALTER COLUMN "listingId" DROP NOT NULL;
ALTER TABLE "Job" ALTER COLUMN "awardedBidId" DROP NOT NULL;
ALTER TABLE "Job" ADD COLUMN "tenderId" TEXT;
ALTER TABLE "Job" ADD COLUMN "awardedTenderResponseId" TEXT;
CREATE UNIQUE INDEX "Job_tenderId_key" ON "Job"("tenderId");
CREATE UNIQUE INDEX "Job_awardedTenderResponseId_key" ON "Job"("awardedTenderResponseId");
ALTER TABLE "Job" ADD CONSTRAINT "Job_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_awardedTenderResponseId_fkey" FOREIGN KEY ("awardedTenderResponseId") REFERENCES "TenderResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

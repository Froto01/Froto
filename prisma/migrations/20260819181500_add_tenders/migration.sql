-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "volume" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "storageRequired" BOOLEAN NOT NULL DEFAULT false,
    "temperatureRequirement" TEXT,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "responseClosesAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "awardedResponseId" TEXT,
    "awardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderResponse" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "serviceDescription" TEXT,
    "leadTime" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenderResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_awardedResponseId_key" ON "Tender"("awardedResponseId");
CREATE INDEX "Tender_companyId_idx" ON "Tender"("companyId");
CREATE INDEX "Tender_status_idx" ON "Tender"("status");
CREATE INDEX "Tender_responseClosesAt_idx" ON "Tender"("responseClosesAt");
CREATE INDEX "Tender_createdAt_idx" ON "Tender"("createdAt");
CREATE UNIQUE INDEX "TenderResponse_tenderId_companyId_key" ON "TenderResponse"("tenderId", "companyId");
CREATE INDEX "TenderResponse_tenderId_createdAt_idx" ON "TenderResponse"("tenderId", "createdAt");
CREATE INDEX "TenderResponse_companyId_idx" ON "TenderResponse"("companyId");
CREATE INDEX "TenderResponse_status_idx" ON "TenderResponse"("status");

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_awardedResponseId_fkey" FOREIGN KEY ("awardedResponseId") REFERENCES "TenderResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TenderResponse" ADD CONSTRAINT "TenderResponse_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenderResponse" ADD CONSTRAINT "TenderResponse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TenderResponse" ADD CONSTRAINT "TenderResponse_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

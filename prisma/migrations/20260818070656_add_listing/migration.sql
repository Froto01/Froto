CREATE TABLE "Listing" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "listingType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "location" TEXT,
  "origin" TEXT,
  "destination" TEXT,
  "capacityAmount" INTEGER NOT NULL,
  "capacityUnit" TEXT NOT NULL,
  "temperatureClass" TEXT NOT NULL,
  "availableFrom" TIMESTAMP(3) NOT NULL,
  "availableTo" TIMESTAMP(3) NOT NULL,
  "startingBid" DECIMAL(12,2) NOT NULL,
  "minimumBidIncrement" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Listing_companyId_idx" ON "Listing"("companyId");
CREATE INDEX "Listing_status_idx" ON "Listing"("status");
CREATE INDEX "Listing_listingType_idx" ON "Listing"("listingType");

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

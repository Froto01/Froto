CREATE TABLE "Bid" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "bidderCompanyId" TEXT NOT NULL,
  "placedByUserId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Bid_listingId_createdAt_idx" ON "Bid"("listingId", "createdAt");
CREATE INDEX "Bid_bidderCompanyId_idx" ON "Bid"("bidderCompanyId");
CREATE INDEX "Bid_placedByUserId_idx" ON "Bid"("placedByUserId");

ALTER TABLE "Bid"
ADD CONSTRAINT "Bid_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Bid"
ADD CONSTRAINT "Bid_bidderCompanyId_fkey"
FOREIGN KEY ("bidderCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Bid"
ADD CONSTRAINT "Bid_placedByUserId_fkey"
FOREIGN KEY ("placedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

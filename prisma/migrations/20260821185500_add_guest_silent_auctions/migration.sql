CREATE TABLE "GuestAuction" (
  "id" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "itemDescription" TEXT NOT NULL,
  "pickupLocation" TEXT NOT NULL,
  "deliveryLocation" TEXT NOT NULL,
  "pickupDate" TIMESTAMP(3),
  "deliveryBy" TIMESTAMP(3),
  "auctionClosesAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "awardedBidId" TEXT,
  "awardedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestAuction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GuestAuctionBid" (
  "id" TEXT NOT NULL,
  "guestAuctionId" TEXT NOT NULL,
  "bidderCompanyId" TEXT NOT NULL,
  "placedByUserId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "serviceDescription" TEXT,
  "leadTime" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestAuctionBid_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GuestAuctionBid_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "GuestAuction_awardedBidId_key" ON "GuestAuction"("awardedBidId");
CREATE INDEX "GuestAuction_createdByUserId_idx" ON "GuestAuction"("createdByUserId");
CREATE INDEX "GuestAuction_status_idx" ON "GuestAuction"("status");
CREATE INDEX "GuestAuction_auctionClosesAt_idx" ON "GuestAuction"("auctionClosesAt");
CREATE INDEX "GuestAuction_createdAt_idx" ON "GuestAuction"("createdAt");

CREATE UNIQUE INDEX "GuestAuctionBid_guestAuctionId_bidderCompanyId_key" ON "GuestAuctionBid"("guestAuctionId", "bidderCompanyId");
CREATE INDEX "GuestAuctionBid_guestAuctionId_createdAt_idx" ON "GuestAuctionBid"("guestAuctionId", "createdAt");
CREATE INDEX "GuestAuctionBid_bidderCompanyId_idx" ON "GuestAuctionBid"("bidderCompanyId");
CREATE INDEX "GuestAuctionBid_placedByUserId_idx" ON "GuestAuctionBid"("placedByUserId");

ALTER TABLE "GuestAuction"
ADD CONSTRAINT "GuestAuction_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuestAuctionBid"
ADD CONSTRAINT "GuestAuctionBid_guestAuctionId_fkey"
FOREIGN KEY ("guestAuctionId") REFERENCES "GuestAuction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuestAuctionBid"
ADD CONSTRAINT "GuestAuctionBid_bidderCompanyId_fkey"
FOREIGN KEY ("bidderCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuestAuctionBid"
ADD CONSTRAINT "GuestAuctionBid_placedByUserId_fkey"
FOREIGN KEY ("placedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuestAuction"
ADD CONSTRAINT "GuestAuction_awardedBidId_fkey"
FOREIGN KEY ("awardedBidId") REFERENCES "GuestAuctionBid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

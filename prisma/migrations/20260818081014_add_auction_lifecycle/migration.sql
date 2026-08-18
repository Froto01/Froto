ALTER TABLE "Listing" ADD COLUMN "biddingClosesAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN "awardedBidId" TEXT;
ALTER TABLE "Listing" ADD COLUMN "awardedAt" TIMESTAMP(3);

CREATE INDEX "Listing_biddingClosesAt_idx" ON "Listing"("biddingClosesAt");
CREATE UNIQUE INDEX "Listing_awardedBidId_key" ON "Listing"("awardedBidId");

ALTER TABLE "Listing"
ADD CONSTRAINT "Listing_awardedBidId_fkey"
FOREIGN KEY ("awardedBidId") REFERENCES "Bid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GuestAuctionReview" (
  "id" TEXT NOT NULL,
  "guestAuctionId" TEXT NOT NULL,
  "reviewedCompanyId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestAuctionReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestAuctionReview_guestAuctionId_key" ON "GuestAuctionReview"("guestAuctionId");
CREATE INDEX "GuestAuctionReview_reviewedCompanyId_createdAt_idx" ON "GuestAuctionReview"("reviewedCompanyId", "createdAt");
CREATE INDEX "GuestAuctionReview_reviewerUserId_idx" ON "GuestAuctionReview"("reviewerUserId");

ALTER TABLE "GuestAuctionReview" ADD CONSTRAINT "GuestAuctionReview_guestAuctionId_fkey" FOREIGN KEY ("guestAuctionId") REFERENCES "GuestAuction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestAuctionReview" ADD CONSTRAINT "GuestAuctionReview_reviewedCompanyId_fkey" FOREIGN KEY ("reviewedCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuestAuctionReview" ADD CONSTRAINT "GuestAuctionReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

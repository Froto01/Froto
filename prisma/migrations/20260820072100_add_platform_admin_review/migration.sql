ALTER TABLE "User"
ADD COLUMN "platformRole" TEXT NOT NULL DEFAULT 'USER';

ALTER TABLE "Company"
ADD COLUMN "verificationReviewedByUserId" TEXT;

CREATE INDEX "Company_verificationReviewedByUserId_idx"
ON "Company"("verificationReviewedByUserId");

ALTER TABLE "Company"
ADD CONSTRAINT "Company_verificationReviewedByUserId_fkey"
FOREIGN KEY ("verificationReviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

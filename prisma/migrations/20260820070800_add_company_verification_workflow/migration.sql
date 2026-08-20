ALTER TABLE "Company"
ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
ADD COLUMN "verificationReviewedAt" TIMESTAMP(3),
ADD COLUMN "verificationNotes" TEXT;

CREATE TABLE "Review" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "reviewerCompanyId" TEXT NOT NULL,
  "reviewedCompanyId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
  CONSTRAINT "Review_companies_check" CHECK ("reviewerCompanyId" <> "reviewedCompanyId")
);

CREATE UNIQUE INDEX "Review_jobId_reviewerCompanyId_key" ON "Review"("jobId", "reviewerCompanyId");
CREATE INDEX "Review_reviewedCompanyId_createdAt_idx" ON "Review"("reviewedCompanyId", "createdAt");
CREATE INDEX "Review_reviewerUserId_idx" ON "Review"("reviewerUserId");

ALTER TABLE "Review" ADD CONSTRAINT "Review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerCompanyId_fkey" FOREIGN KEY ("reviewerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewedCompanyId_fkey" FOREIGN KEY ("reviewedCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

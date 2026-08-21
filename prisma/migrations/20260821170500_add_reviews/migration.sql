CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "reviewerCompanyId" TEXT NOT NULL,
    "revieweeCompanyId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "Review_companies_check" CHECK ("reviewerCompanyId" <> "revieweeCompanyId")
);

CREATE UNIQUE INDEX "Review_jobId_reviewerCompanyId_key" ON "Review"("jobId", "reviewerCompanyId");
CREATE INDEX "Review_revieweeCompanyId_createdAt_idx" ON "Review"("revieweeCompanyId", "createdAt");
CREATE INDEX "Review_reviewerCompanyId_createdAt_idx" ON "Review"("reviewerCompanyId", "createdAt");
CREATE INDEX "Review_jobId_idx" ON "Review"("jobId");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_jobId_fkey"
FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_reviewerCompanyId_fkey"
FOREIGN KEY ("reviewerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_revieweeCompanyId_fkey"
FOREIGN KEY ("revieweeCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_reviewerUserId_fkey"
FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

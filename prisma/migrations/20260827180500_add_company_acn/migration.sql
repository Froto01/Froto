ALTER TABLE "Company" ADD COLUMN "acn" TEXT;

CREATE UNIQUE INDEX "Company_acn_key" ON "Company"("acn");

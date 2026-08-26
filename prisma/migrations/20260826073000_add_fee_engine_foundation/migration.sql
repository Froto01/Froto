-- CreateEnum
CREATE TYPE "FeeTransactionType" AS ENUM ('MARKETPLACE_JOB', 'TENDER_JOB', 'GUEST_AUCTION', 'PROMOTED_LISTING');

-- CreateEnum
CREATE TYPE "FeePayerType" AS ENUM ('BUYER', 'PROVIDER', 'GUEST', 'COMPANY');

-- CreateEnum
CREATE TYPE "TransactionFeeStatus" AS ENUM ('CALCULATED', 'EARNED', 'INVOICED', 'PAID', 'WAIVED', 'REFUNDED', 'VOID');

-- CreateTable
CREATE TABLE "FeeRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "transactionType" "FeeTransactionType" NOT NULL,
    "percentageBps" INTEGER NOT NULL,
    "minimumFee" DECIMAL(12,2),
    "maximumFee" DECIMAL(12,2),
    "gstBps" INTEGER NOT NULL DEFAULT 1000,
    "payerType" "FeePayerType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionFee" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "feeRuleId" TEXT NOT NULL,
    "feeRuleCode" TEXT NOT NULL,
    "feeRuleVersion" INTEGER NOT NULL,
    "transactionType" "FeeTransactionType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "payerType" "FeePayerType" NOT NULL,
    "payerCompanyId" TEXT,
    "payerUserId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "transactionAmount" DECIMAL(12,2) NOT NULL,
    "percentageBps" INTEGER NOT NULL,
    "minimumFee" DECIMAL(12,2),
    "maximumFee" DECIMAL(12,2),
    "gstBps" INTEGER NOT NULL,
    "feeExGst" DECIMAL(12,2) NOT NULL,
    "gstAmount" DECIMAL(12,2) NOT NULL,
    "feeIncGst" DECIMAL(12,2) NOT NULL,
    "status" "TransactionFeeStatus" NOT NULL DEFAULT 'CALCULATED',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "earnedAt" TIMESTAMP(3),
    "invoicedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "waivedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "paymentProvider" TEXT,
    "paymentProviderReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeRule_code_version_key" ON "FeeRule"("code", "version");
CREATE INDEX "FeeRule_transactionType_active_idx" ON "FeeRule"("transactionType", "active");
CREATE INDEX "FeeRule_effectiveFrom_effectiveTo_idx" ON "FeeRule"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionFee_idempotencyKey_key" ON "TransactionFee"("idempotencyKey");
CREATE INDEX "TransactionFee_transactionType_sourceId_idx" ON "TransactionFee"("transactionType", "sourceId");
CREATE INDEX "TransactionFee_status_createdAt_idx" ON "TransactionFee"("status", "createdAt");
CREATE INDEX "TransactionFee_payerCompanyId_idx" ON "TransactionFee"("payerCompanyId");
CREATE INDEX "TransactionFee_payerUserId_idx" ON "TransactionFee"("payerUserId");
CREATE INDEX "TransactionFee_feeRuleId_idx" ON "TransactionFee"("feeRuleId");

-- AddForeignKey
ALTER TABLE "TransactionFee" ADD CONSTRAINT "TransactionFee_feeRuleId_fkey" FOREIGN KEY ("feeRuleId") REFERENCES "FeeRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

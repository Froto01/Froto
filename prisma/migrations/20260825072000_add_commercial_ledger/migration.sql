-- CreateEnum
CREATE TYPE "CommercialPaymentMode" AS ENUM ('UNSET', 'PLATFORM', 'COMMERCIAL_TERMS', 'MANUAL');

-- CreateEnum
CREATE TYPE "CommercialPaymentStatus" AS ENUM ('UNSET', 'NOT_REQUIRED', 'PENDING', 'REQUIRES_ACTION', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommercialSettlementStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'AVAILABLE', 'PAID_OUT', 'FAILED', 'HELD');

-- CreateEnum
CREATE TYPE "FeeKind" AS ENUM ('PERCENTAGE', 'FIXED', 'PERCENTAGE_WITH_LIMITS');

-- CreateEnum
CREATE TYPE "PlatformChargeType" AS ENUM ('SUCCESS_FEE', 'PROMOTION', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformChargeStatus" AS ENUM ('PENDING', 'DUE', 'PAID', 'WAIVED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('CUSTOMER_TRANSACTION', 'FROTO_FEE', 'PROMOTION', 'CREDIT_NOTE', 'RECEIPT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CREDITED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('REFUND', 'PARTIAL_REFUND', 'CREDIT', 'DEBIT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('FEATURED', 'PRIORITY', 'URGENT', 'FEATURED_WAREHOUSE', 'HIGHLIGHTED_TENDER');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CommercialTransaction" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "guestAuctionId" TEXT,
    "buyerCompanyId" TEXT,
    "buyerUserId" TEXT,
    "providerCompanyId" TEXT NOT NULL,
    "grossAmountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "paymentMode" "CommercialPaymentMode" NOT NULL DEFAULT 'UNSET',
    "paymentStatus" "CommercialPaymentStatus" NOT NULL DEFAULT 'UNSET',
    "settlementStatus" "CommercialSettlementStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "paymentTerms" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CommercialTransaction_source_check" CHECK ((("jobId" IS NOT NULL)::int + ("guestAuctionId" IS NOT NULL)::int) = 1),
    CONSTRAINT "CommercialTransaction_buyer_check" CHECK ((("buyerCompanyId" IS NOT NULL)::int + ("buyerUserId" IS NOT NULL)::int) = 1),
    CONSTRAINT "CommercialTransaction_amount_check" CHECK ("grossAmountMinor" >= 0)
);

-- CreateTable
CREATE TABLE "FeeRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transactionScope" TEXT,
    "feeKind" "FeeKind" NOT NULL,
    "percentageBps" INTEGER,
    "fixedAmountMinor" BIGINT,
    "minimumAmountMinor" BIGINT,
    "maximumAmountMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeeRule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeeRule_percentage_check" CHECK ("percentageBps" IS NULL OR ("percentageBps" >= 0 AND "percentageBps" <= 10000)),
    CONSTRAINT "FeeRule_amount_check" CHECK (
      ("fixedAmountMinor" IS NULL OR "fixedAmountMinor" >= 0) AND
      ("minimumAmountMinor" IS NULL OR "minimumAmountMinor" >= 0) AND
      ("maximumAmountMinor" IS NULL OR "maximumAmountMinor" >= 0) AND
      ("minimumAmountMinor" IS NULL OR "maximumAmountMinor" IS NULL OR "minimumAmountMinor" <= "maximumAmountMinor")
    )
);

-- CreateTable
CREATE TABLE "PlatformCharge" (
    "id" TEXT NOT NULL,
    "commercialTransactionId" TEXT,
    "feeRuleId" TEXT,
    "chargeType" "PlatformChargeType" NOT NULL,
    "status" "PlatformChargeStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT NOT NULL,
    "taxAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "calculationSnapshot" JSONB,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformCharge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlatformCharge_amount_check" CHECK ("amountMinor" >= 0 AND "taxAmountMinor" >= 0)
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "commercialTransactionId" TEXT NOT NULL,
    "provider" TEXT,
    "providerPaymentRef" TEXT,
    "paymentMethod" TEXT,
    "status" "CommercialPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "occurredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PaymentRecord_amount_check" CHECK ("amountMinor" >= 0)
);

-- CreateTable
CREATE TABLE "InvoiceRecord" (
    "id" TEXT NOT NULL,
    "commercialTransactionId" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "invoiceNumber" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotalMinor" BIGINT NOT NULL,
    "taxAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "externalReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InvoiceRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InvoiceRecord_amount_check" CHECK ("subtotalMinor" >= 0 AND "taxAmountMinor" >= 0 AND "totalMinor" >= 0)
);

-- CreateTable
CREATE TABLE "RefundAdjustment" (
    "id" TEXT NOT NULL,
    "commercialTransactionId" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "taxAmountMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "reason" TEXT,
    "providerReference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefundAdjustment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RefundAdjustment_amount_check" CHECK ("amountMinor" >= 0 AND "taxAmountMinor" >= 0)
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "tenderId" TEXT,
    "guestAuctionId" TEXT,
    "purchaserCompanyId" TEXT,
    "purchaserUserId" TEXT,
    "promotionType" "PromotionType" NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" BIGINT,
    "taxAmountMinor" BIGINT DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Promotion_target_check" CHECK ((("listingId" IS NOT NULL)::int + ("tenderId" IS NOT NULL)::int + ("guestAuctionId" IS NOT NULL)::int) = 1),
    CONSTRAINT "Promotion_purchaser_check" CHECK ((("purchaserCompanyId" IS NOT NULL)::int + ("purchaserUserId" IS NOT NULL)::int) = 1),
    CONSTRAINT "Promotion_amount_check" CHECK (("amountMinor" IS NULL OR "amountMinor" >= 0) AND ("taxAmountMinor" IS NULL OR "taxAmountMinor" >= 0)),
    CONSTRAINT "Promotion_period_check" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "startsAt" <= "endsAt")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialTransaction_jobId_key" ON "CommercialTransaction"("jobId");
CREATE UNIQUE INDEX "CommercialTransaction_guestAuctionId_key" ON "CommercialTransaction"("guestAuctionId");
CREATE INDEX "CommercialTransaction_buyerCompanyId_createdAt_idx" ON "CommercialTransaction"("buyerCompanyId", "createdAt");
CREATE INDEX "CommercialTransaction_buyerUserId_createdAt_idx" ON "CommercialTransaction"("buyerUserId", "createdAt");
CREATE INDEX "CommercialTransaction_providerCompanyId_createdAt_idx" ON "CommercialTransaction"("providerCompanyId", "createdAt");
CREATE INDEX "CommercialTransaction_paymentStatus_idx" ON "CommercialTransaction"("paymentStatus");
CREATE INDEX "CommercialTransaction_settlementStatus_idx" ON "CommercialTransaction"("settlementStatus");

CREATE INDEX "FeeRule_active_effectiveFrom_idx" ON "FeeRule"("active", "effectiveFrom");
CREATE INDEX "FeeRule_transactionScope_idx" ON "FeeRule"("transactionScope");

CREATE INDEX "PlatformCharge_commercialTransactionId_createdAt_idx" ON "PlatformCharge"("commercialTransactionId", "createdAt");
CREATE INDEX "PlatformCharge_status_dueAt_idx" ON "PlatformCharge"("status", "dueAt");
CREATE INDEX "PlatformCharge_chargeType_idx" ON "PlatformCharge"("chargeType");

CREATE INDEX "PaymentRecord_commercialTransactionId_createdAt_idx" ON "PaymentRecord"("commercialTransactionId", "createdAt");
CREATE INDEX "PaymentRecord_provider_providerPaymentRef_idx" ON "PaymentRecord"("provider", "providerPaymentRef");
CREATE INDEX "PaymentRecord_status_idx" ON "PaymentRecord"("status");

CREATE UNIQUE INDEX "InvoiceRecord_invoiceNumber_key" ON "InvoiceRecord"("invoiceNumber");
CREATE INDEX "InvoiceRecord_commercialTransactionId_createdAt_idx" ON "InvoiceRecord"("commercialTransactionId", "createdAt");
CREATE INDEX "InvoiceRecord_status_dueAt_idx" ON "InvoiceRecord"("status", "dueAt");

CREATE INDEX "RefundAdjustment_commercialTransactionId_occurredAt_idx" ON "RefundAdjustment"("commercialTransactionId", "occurredAt");
CREATE INDEX "RefundAdjustment_adjustmentType_idx" ON "RefundAdjustment"("adjustmentType");

CREATE INDEX "Promotion_listingId_status_idx" ON "Promotion"("listingId", "status");
CREATE INDEX "Promotion_tenderId_status_idx" ON "Promotion"("tenderId", "status");
CREATE INDEX "Promotion_guestAuctionId_status_idx" ON "Promotion"("guestAuctionId", "status");
CREATE INDEX "Promotion_status_startsAt_endsAt_idx" ON "Promotion"("status", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "CommercialTransaction" ADD CONSTRAINT "CommercialTransaction_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialTransaction" ADD CONSTRAINT "CommercialTransaction_guestAuctionId_fkey" FOREIGN KEY ("guestAuctionId") REFERENCES "GuestAuction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialTransaction" ADD CONSTRAINT "CommercialTransaction_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialTransaction" ADD CONSTRAINT "CommercialTransaction_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialTransaction" ADD CONSTRAINT "CommercialTransaction_providerCompanyId_fkey" FOREIGN KEY ("providerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformCharge" ADD CONSTRAINT "PlatformCharge_commercialTransactionId_fkey" FOREIGN KEY ("commercialTransactionId") REFERENCES "CommercialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlatformCharge" ADD CONSTRAINT "PlatformCharge_feeRuleId_fkey" FOREIGN KEY ("feeRuleId") REFERENCES "FeeRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_commercialTransactionId_fkey" FOREIGN KEY ("commercialTransactionId") REFERENCES "CommercialTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceRecord" ADD CONSTRAINT "InvoiceRecord_commercialTransactionId_fkey" FOREIGN KEY ("commercialTransactionId") REFERENCES "CommercialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundAdjustment" ADD CONSTRAINT "RefundAdjustment_commercialTransactionId_fkey" FOREIGN KEY ("commercialTransactionId") REFERENCES "CommercialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_guestAuctionId_fkey" FOREIGN KEY ("guestAuctionId") REFERENCES "GuestAuction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_purchaserCompanyId_fkey" FOREIGN KEY ("purchaserCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_purchaserUserId_fkey" FOREIGN KEY ("purchaserUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

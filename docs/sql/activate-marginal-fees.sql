-- Separate approval required. Deploy compatible code BEFORE activation.
-- Lock against concurrent awards while atomically switching all three rules.
BEGIN;
LOCK TABLE "FeeRule" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
 IF (SELECT COUNT(*) FROM "FeeRule" WHERE "active" AND "transactionType" IN ('MARKETPLACE_JOB','TENDER_JOB','GUEST_AUCTION')) <> 3
 OR (SELECT COUNT(*) FROM "FeeRule" WHERE "active" AND "version"=1 AND "code" IN ('FROTO_MARKETPLACE_SUCCESS','FROTO_TENDER_SUCCESS','FROTO_GUEST_AUCTION_SUCCESS') AND "percentageBps"=300 AND "minimumFee"=10 AND "maximumFee"=500 AND "gstBps"=1000 AND "payerType"='PROVIDER' AND ("effectiveFrom" IS NULL OR "effectiveFrom"<=CURRENT_TIMESTAMP) AND ("effectiveTo" IS NULL OR "effectiveTo">CURRENT_TIMESTAMP)) <> 3
 THEN RAISE EXCEPTION 'Expected exactly three original active launch rules; review current policy before activation'; END IF;
 IF (SELECT COUNT(*) FROM "FeeRule" WHERE "code" IN ('FROTO_MARKETPLACE_MARGINAL','FROTO_TENDER_MARGINAL','FROTO_GUEST_MARGINAL')) <> 3
 OR (SELECT COUNT(*) FROM "FeeRule" WHERE "version"=1 AND NOT "active" AND "percentageBps"=1000 AND "minimumFee"=10 AND "maximumFee" IS NULL AND "gstBps"=1000 AND "payerType"='PROVIDER' AND (("code"='FROTO_MARKETPLACE_MARGINAL' AND "transactionType"='MARKETPLACE_JOB') OR ("code"='FROTO_TENDER_MARGINAL' AND "transactionType"='TENDER_JOB') OR ("code"='FROTO_GUEST_MARGINAL' AND "transactionType"='GUEST_AUCTION'))) <> 3
 THEN RAISE EXCEPTION 'Expected three prepared marginal v1 rules'; END IF;
END $$;
UPDATE "FeeRule" SET "active"=false,"effectiveTo"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP
 WHERE "code" IN ('FROTO_MARKETPLACE_SUCCESS','FROTO_TENDER_SUCCESS','FROTO_GUEST_AUCTION_SUCCESS') AND "version"=1;
UPDATE "FeeRule" SET "active"=true,"effectiveFrom"=CURRENT_TIMESTAMP,"effectiveTo"=NULL,"updatedAt"=CURRENT_TIMESTAMP
 WHERE "code" IN ('FROTO_MARKETPLACE_MARGINAL','FROTO_TENDER_MARGINAL','FROTO_GUEST_MARGINAL') AND "version"=1;
COMMIT;

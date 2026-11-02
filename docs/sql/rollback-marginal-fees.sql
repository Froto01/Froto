-- Separate approval required. Keep marginal-capable code while old snapshots exist.
-- Never rewrite or delete TransactionFee rows.
BEGIN;
LOCK TABLE "FeeRule" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF (SELECT COUNT(*) FROM "FeeRule" WHERE "active" AND "transactionType" IN ('MARKETPLACE_JOB','TENDER_JOB','GUEST_AUCTION')) <> 3
 OR (SELECT COUNT(*) FROM "FeeRule" WHERE "active" AND "version"=1 AND "code" IN ('FROTO_MARKETPLACE_MARGINAL','FROTO_TENDER_MARGINAL','FROTO_GUEST_MARGINAL')) <> 3
 OR (SELECT COUNT(*) FROM "FeeRule" WHERE NOT "active" AND "version"=1 AND "code" IN ('FROTO_MARKETPLACE_SUCCESS','FROTO_TENDER_SUCCESS','FROTO_GUEST_AUCTION_SUCCESS') AND "percentageBps"=300 AND "minimumFee"=10 AND "maximumFee"=500 AND "gstBps"=1000 AND "payerType"='PROVIDER') <> 3
 THEN RAISE EXCEPTION 'Unexpected current rules; manual policy review required'; END IF;
END $$;
UPDATE "FeeRule" SET "active"=false,"effectiveTo"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP
 WHERE "code" IN ('FROTO_MARKETPLACE_MARGINAL','FROTO_TENDER_MARGINAL','FROTO_GUEST_MARGINAL') AND "version"=1;
UPDATE "FeeRule" SET "active"=true,"effectiveTo"=NULL,"updatedAt"=CURRENT_TIMESTAMP
 WHERE "code" IN ('FROTO_MARKETPLACE_SUCCESS','FROTO_TENDER_SUCCESS','FROTO_GUEST_AUCTION_SUCCESS') AND "version"=1;
COMMIT;

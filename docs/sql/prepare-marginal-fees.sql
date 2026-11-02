-- Run only in an explicitly approved environment. Not an automatic migration.
-- Preparation alone does not change active pricing.
BEGIN;
INSERT INTO "FeeRule" ("id", "code", "version", "transactionType", "percentageBps", "minimumFee", "maximumFee", "gstBps", "payerType", "active", "notes", "createdAt", "updatedAt")
VALUES
 ('fee_marketplace_marginal_v1','FROTO_MARKETPLACE_MARGINAL',1,'MARKETPLACE_JOB',1000,10,NULL,1000,'PROVIDER',false,'Marginal v1: first $250 10%; next $250 7%; next $1500 5%; remainder 3%. $10 minimum, no cap. percentageBps is first-tier rate, not effective rate.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
 ('fee_tender_marginal_v1','FROTO_TENDER_MARGINAL',1,'TENDER_JOB',1000,10,NULL,1000,'PROVIDER',false,'Marginal v1: first $250 10%; next $250 7%; next $1500 5%; remainder 3%. $10 minimum, no cap. percentageBps is first-tier rate, not effective rate.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
 ('fee_guest_marginal_v1','FROTO_GUEST_MARGINAL',1,'GUEST_AUCTION',1000,10,NULL,1000,'PROVIDER',false,'Marginal v1: first $250 10%; next $250 7%; next $1500 5%; remainder 3%. $10 minimum, no cap. percentageBps is first-tier rate, not effective rate.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
COMMIT;

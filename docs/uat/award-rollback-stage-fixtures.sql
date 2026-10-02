-- Isolated UAT stage attribution; never apply to the original database.
INSERT INTO "SpotRequirement" (id,"companyId","createdByUserId","requirementType",title,origin,destination,quantity,"quantityUnit","requiredFrom",notes,status,"updatedAt") VALUES ('uat-rollback-spot-fee-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','TRANSPORT','SIMULATED rollback spot fee','Brisbane','Gold Coast',1,'pallet','2026-10-07T00:00:00Z','SIMULATED_ROLLBACK_STAGE_UAT_ONLY','OPEN',now());

INSERT INTO "SpotOffer" (id,"spotRequirementId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-rollback-spot-fee-20261002-a','uat-rollback-spot-fee-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now()),('uat-rollback-spot-fee-20261002-b','uat-rollback-spot-fee-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now());

INSERT INTO "SpotRequirement" (id,"companyId","createdByUserId","requirementType",title,origin,destination,quantity,"quantityUnit","requiredFrom",notes,status,"updatedAt") VALUES ('uat-rollback-spot-notification-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','TRANSPORT','SIMULATED rollback spot notification','Brisbane','Gold Coast',1,'pallet','2026-10-07T00:00:00Z','SIMULATED_ROLLBACK_STAGE_UAT_ONLY','OPEN',now());

INSERT INTO "SpotOffer" (id,"spotRequirementId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-rollback-spot-notification-20261002-a','uat-rollback-spot-notification-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now()),('uat-rollback-spot-notification-20261002-b','uat-rollback-spot-notification-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now());

INSERT INTO "Listing" (id,"companyId","listingType",title,origin,destination,"capacityAmount","capacityUnit","temperatureClass","availableFrom","availableTo","startingBid","minimumBidIncrement","biddingClosesAt",notes,status,"updatedAt") VALUES ('uat-rollback-marketplace-fee-20261002','cmspngf8m000104jlqsjud72s','TRANSPORT','SIMULATED rollback marketplace fee','Brisbane','Gold Coast',1,'pallet','AMBIENT','2026-10-07T00:00:00Z','2026-10-08T00:00:00Z',100,10,now()-interval '1 hour','SIMULATED_ROLLBACK_STAGE_UAT_ONLY','ACTIVE',now());

INSERT INTO "Bid" (id,"listingId","bidderCompanyId","placedByUserId",amount) VALUES ('uat-rollback-marketplace-fee-20261002-a','uat-rollback-marketplace-fee-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250),('uat-rollback-marketplace-fee-20261002-b','uat-rollback-marketplace-fee-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300);

INSERT INTO "Listing" (id,"companyId","listingType",title,origin,destination,"capacityAmount","capacityUnit","temperatureClass","availableFrom","availableTo","startingBid","minimumBidIncrement","biddingClosesAt",notes,status,"updatedAt") VALUES ('uat-rollback-marketplace-notification-20261002','cmspngf8m000104jlqsjud72s','TRANSPORT','SIMULATED rollback marketplace notification','Brisbane','Gold Coast',1,'pallet','AMBIENT','2026-10-07T00:00:00Z','2026-10-08T00:00:00Z',100,10,now()-interval '1 hour','SIMULATED_ROLLBACK_STAGE_UAT_ONLY','ACTIVE',now());

INSERT INTO "Bid" (id,"listingId","bidderCompanyId","placedByUserId",amount) VALUES ('uat-rollback-marketplace-notification-20261002-a','uat-rollback-marketplace-notification-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250),('uat-rollback-marketplace-notification-20261002-b','uat-rollback-marketplace-notification-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300);

INSERT INTO "Tender" (id,"companyId","createdByUserId",title,"productDescription",volume,origin,destination,"deliveryDate","responseClosesAt",notes,status,"updatedAt") VALUES ('uat-rollback-tender-fee-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','SIMULATED rollback tender fee','Simulated pallet transport','1 pallet','Brisbane','Gold Coast','2026-10-07T00:00:00Z',now()-interval '1 hour','SIMULATED_ROLLBACK_STAGE_UAT_ONLY','OPEN',now());

INSERT INTO "TenderResponse" (id,"tenderId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-rollback-tender-fee-20261002-a','uat-rollback-tender-fee-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',500,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now()),('uat-rollback-tender-fee-20261002-b','uat-rollback-tender-fee-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',600,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now());

INSERT INTO "Tender" (id,"companyId","createdByUserId",title,"productDescription",volume,origin,destination,"deliveryDate","responseClosesAt",notes,status,"updatedAt") VALUES ('uat-rollback-tender-notification-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','SIMULATED rollback tender notification','Simulated pallet transport','1 pallet','Brisbane','Gold Coast','2026-10-07T00:00:00Z',now()-interval '1 hour','SIMULATED_ROLLBACK_STAGE_UAT_ONLY','OPEN',now());

INSERT INTO "TenderResponse" (id,"tenderId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-rollback-tender-notification-20261002-a','uat-rollback-tender-notification-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',500,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now()),('uat-rollback-tender-notification-20261002-b','uat-rollback-tender-notification-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',600,'SIMULATED_ROLLBACK_STAGE_UAT_ONLY','SUBMITTED',now());


CREATE SEQUENCE froto_uat_stage_spot_fee_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_stage_spot_notification_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_stage_marketplace_fee_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_stage_marketplace_notification_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_stage_tender_fee_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_stage_tender_notification_20261002 CACHE 1;
CREATE OR REPLACE FUNCTION froto_uat_fee_failure_20261001() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_id text; job_id text; kind text; counter_name text; winner_type text; BEGIN
source_id := COALESCE(NEW.metadata->>'spotRequirementId',NEW.metadata->>'listingId',NEW.metadata->>'tenderId');
IF source_id IN ('uat-rollback-spot-fee-20261001','uat-rollback-marketplace-fee-20261001','uat-rollback-tender-fee-20261001') THEN RAISE EXCEPTION 'FROTO_UAT_INJECTED_FEE_FAILURE'; END IF;
CASE source_id
WHEN 'uat-rollback-spot-fee-20261002' THEN kind := 'spot'; counter_name := 'froto_uat_stage_spot_fee_20261002';
WHEN 'uat-rollback-marketplace-fee-20261002' THEN kind := 'marketplace'; counter_name := 'froto_uat_stage_marketplace_fee_20261002';
WHEN 'uat-rollback-tender-fee-20261002' THEN kind := 'tender'; counter_name := 'froto_uat_stage_tender_fee_20261002';
ELSE RETURN NEW; END CASE;
SELECT id INTO STRICT job_id FROM "Job" WHERE "spotRequirementId" = source_id OR "listingId" = source_id OR "tenderId" = source_id;
IF (SELECT count(*) FROM "JobEvent" WHERE "jobId" = job_id AND "eventType" = 'AWARDED') <> 1 THEN RAISE EXCEPTION 'FROTO_UAT_STAGE_PRECONDITION_FAILED'; END IF;
IF NEW."sourceId" <> job_id OR NEW.status <> 'CALCULATED' THEN RAISE EXCEPTION 'FROTO_UAT_STAGE_PRECONDITION_FAILED'; END IF;
PERFORM nextval(counter_name::regclass);
RAISE EXCEPTION 'FROTO_UAT_INJECTED_FEE_FAILURE';
END; $$;

CREATE OR REPLACE FUNCTION froto_uat_notification_failure_20261001() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_id text; job_id text; kind text; counter_name text; winner_type text; BEGIN
source_id := COALESCE(NEW.metadata->>'spotRequirementId',NEW.metadata->>'listingId',NEW.metadata->>'tenderId');
IF source_id IN ('uat-rollback-spot-notification-20261001','uat-rollback-marketplace-notification-20261001','uat-rollback-tender-notification-20261001') AND NEW.type IN ('SPOT_REQUIREMENT_AWARD_UNSUCCESSFUL','MARKETPLACE_AWARD_UNSUCCESSFUL','TENDER_AWARD_UNSUCCESSFUL') THEN RAISE EXCEPTION 'FROTO_UAT_INJECTED_NOTIFICATION_FAILURE'; END IF;
CASE source_id
WHEN 'uat-rollback-spot-notification-20261002' THEN kind := 'spot'; counter_name := 'froto_uat_stage_spot_notification_20261002';
WHEN 'uat-rollback-marketplace-notification-20261002' THEN kind := 'marketplace'; counter_name := 'froto_uat_stage_marketplace_notification_20261002';
WHEN 'uat-rollback-tender-notification-20261002' THEN kind := 'tender'; counter_name := 'froto_uat_stage_tender_notification_20261002';
ELSE RETURN NEW; END CASE;
winner_type := CASE kind WHEN 'spot' THEN 'SPOT_REQUIREMENT_AWARD_WON' WHEN 'marketplace' THEN 'MARKETPLACE_AWARD_WON' ELSE 'TENDER_AWARD_WON' END;
IF NEW.type <> replace(winner_type,'_WON','_UNSUCCESSFUL') THEN RETURN NEW; END IF;
SELECT id INTO STRICT job_id FROM "Job" WHERE "spotRequirementId" = source_id OR "listingId" = source_id OR "tenderId" = source_id;
IF (SELECT count(*) FROM "JobEvent" WHERE "jobId" = job_id AND "eventType" = 'AWARDED') <> 1 THEN RAISE EXCEPTION 'FROTO_UAT_STAGE_PRECONDITION_FAILED'; END IF;
IF (SELECT count(*) FROM "TransactionFee" WHERE "sourceId" = job_id AND status = 'CALCULATED') <> 1 OR (SELECT count(*) FROM "Notification" WHERE type = winner_type AND metadata->>'jobId' = job_id) <> 1 OR NEW."companyId" <> 'cmswxy2qk000104jrprhjuodn' THEN RAISE EXCEPTION 'FROTO_UAT_STAGE_PRECONDITION_FAILED'; END IF;
PERFORM nextval(counter_name::regclass);
RAISE EXCEPTION 'FROTO_UAT_INJECTED_NOTIFICATION_FAILURE';
END; $$;

-- Separate preparation probe: it must not touch any of the six real stage counters.
CREATE SEQUENCE froto_uat_receipt_probe_20261002 CACHE 1;
DO $$ BEGIN BEGIN PERFORM nextval('froto_uat_receipt_probe_20261002'); RAISE EXCEPTION 'FROTO_UAT_PROBE_ROLLBACK'; EXCEPTION WHEN raise_exception THEN NULL; END; END; $$;
SELECT last_value,is_called FROM froto_uat_receipt_probe_20261002;

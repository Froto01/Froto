-- Isolated invalid configuration award UAT. Not an application migration.
INSERT INTO "SpotRequirement" (id,"companyId","createdByUserId","requirementType",title,origin,destination,quantity,"quantityUnit","requiredFrom",notes,status,"updatedAt") VALUES ('uat-invalid-fee-spot-overlap-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','TRANSPORT','SIMULATED invalid fee spot fee','Brisbane','Gold Coast',1,'pallet','2026-10-07T00:00:00Z','SIMULATED_INVALID_FEE_UAT_ONLY','OPEN',now());

INSERT INTO "SpotOffer" (id,"spotRequirementId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-invalid-fee-spot-overlap-20261002-a','uat-invalid-fee-spot-overlap-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now()),('uat-invalid-fee-spot-overlap-20261002-b','uat-invalid-fee-spot-overlap-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now());

INSERT INTO "SpotRequirement" (id,"companyId","createdByUserId","requirementType",title,origin,destination,quantity,"quantityUnit","requiredFrom",notes,status,"updatedAt") VALUES ('uat-invalid-fee-spot-payer-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','TRANSPORT','SIMULATED invalid fee spot notification','Brisbane','Gold Coast',1,'pallet','2026-10-07T00:00:00Z','SIMULATED_INVALID_FEE_UAT_ONLY','OPEN',now());

INSERT INTO "SpotOffer" (id,"spotRequirementId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-invalid-fee-spot-payer-20261002-a','uat-invalid-fee-spot-payer-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now()),('uat-invalid-fee-spot-payer-20261002-b','uat-invalid-fee-spot-payer-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now());

INSERT INTO "Listing" (id,"companyId","listingType",title,origin,destination,"capacityAmount","capacityUnit","temperatureClass","availableFrom","availableTo","startingBid","minimumBidIncrement","biddingClosesAt",notes,status,"updatedAt") VALUES ('uat-invalid-fee-marketplace-overlap-20261002','cmspngf8m000104jlqsjud72s','TRANSPORT','SIMULATED invalid fee marketplace fee','Brisbane','Gold Coast',1,'pallet','AMBIENT','2026-10-07T00:00:00Z','2026-10-08T00:00:00Z',100,10,now()-interval '1 hour','SIMULATED_INVALID_FEE_UAT_ONLY','ACTIVE',now());

INSERT INTO "Bid" (id,"listingId","bidderCompanyId","placedByUserId",amount) VALUES ('uat-invalid-fee-marketplace-overlap-20261002-a','uat-invalid-fee-marketplace-overlap-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250),('uat-invalid-fee-marketplace-overlap-20261002-b','uat-invalid-fee-marketplace-overlap-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300);

INSERT INTO "Listing" (id,"companyId","listingType",title,origin,destination,"capacityAmount","capacityUnit","temperatureClass","availableFrom","availableTo","startingBid","minimumBidIncrement","biddingClosesAt",notes,status,"updatedAt") VALUES ('uat-invalid-fee-marketplace-payer-20261002','cmspngf8m000104jlqsjud72s','TRANSPORT','SIMULATED invalid fee marketplace notification','Brisbane','Gold Coast',1,'pallet','AMBIENT','2026-10-07T00:00:00Z','2026-10-08T00:00:00Z',100,10,now()-interval '1 hour','SIMULATED_INVALID_FEE_UAT_ONLY','ACTIVE',now());

INSERT INTO "Bid" (id,"listingId","bidderCompanyId","placedByUserId",amount) VALUES ('uat-invalid-fee-marketplace-payer-20261002-a','uat-invalid-fee-marketplace-payer-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',250),('uat-invalid-fee-marketplace-payer-20261002-b','uat-invalid-fee-marketplace-payer-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',300);

INSERT INTO "Tender" (id,"companyId","createdByUserId",title,"productDescription",volume,origin,destination,"deliveryDate","responseClosesAt",notes,status,"updatedAt") VALUES ('uat-invalid-fee-tender-overlap-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','SIMULATED invalid fee tender fee','Simulated pallet transport','1 pallet','Brisbane','Gold Coast','2026-10-07T00:00:00Z',now()-interval '1 hour','SIMULATED_INVALID_FEE_UAT_ONLY','OPEN',now());

INSERT INTO "TenderResponse" (id,"tenderId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-invalid-fee-tender-overlap-20261002-a','uat-invalid-fee-tender-overlap-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',500,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now()),('uat-invalid-fee-tender-overlap-20261002-b','uat-invalid-fee-tender-overlap-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',600,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now());

INSERT INTO "Tender" (id,"companyId","createdByUserId",title,"productDescription",volume,origin,destination,"deliveryDate","responseClosesAt",notes,status,"updatedAt") VALUES ('uat-invalid-fee-tender-payer-20261002','cmspngf8m000104jlqsjud72s','cmsmyvnxo000114uxrnn8sbw6','SIMULATED invalid fee tender notification','Simulated pallet transport','1 pallet','Brisbane','Gold Coast','2026-10-07T00:00:00Z',now()-interval '1 hour','SIMULATED_INVALID_FEE_UAT_ONLY','OPEN',now());

INSERT INTO "TenderResponse" (id,"tenderId","companyId","submittedByUserId",amount,notes,status,"updatedAt") VALUES ('uat-invalid-fee-tender-payer-20261002-a','uat-invalid-fee-tender-payer-20261002','cmt0lfw2q000204ibeaz0w5kj','cmt0leorg000004ibn6opu40h',500,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now()),('uat-invalid-fee-tender-payer-20261002-b','uat-invalid-fee-tender-payer-20261002','cmswxy2qk000104jrprhjuodn','cmswxvkuc000004jrm2ml6yb6',600,'SIMULATED_INVALID_FEE_UAT_ONLY','SUBMITTED',now());



CREATE SEQUENCE froto_uat_config_spot_overlap_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_config_spot_payer_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_config_marketplace_overlap_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_config_marketplace_payer_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_config_tender_overlap_20261002 CACHE 1;
CREATE SEQUENCE froto_uat_config_tender_payer_20261002 CACHE 1;
CREATE FUNCTION froto_uat_invalid_fee_20261002() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE source_id text; kind text; mode text; fee_type "FeeTransactionType"; rule_id text; counter_name text; BEGIN
source_id := COALESCE(NEW."spotRequirementId",NEW."listingId",NEW."tenderId");
CASE source_id
WHEN 'uat-invalid-fee-spot-overlap-20261002' THEN kind := 'spot'; mode := 'overlap'; counter_name := 'froto_uat_config_spot_overlap_20261002';
WHEN 'uat-invalid-fee-spot-payer-20261002' THEN kind := 'spot'; mode := 'payer'; counter_name := 'froto_uat_config_spot_payer_20261002';
WHEN 'uat-invalid-fee-marketplace-overlap-20261002' THEN kind := 'marketplace'; mode := 'overlap'; counter_name := 'froto_uat_config_marketplace_overlap_20261002';
WHEN 'uat-invalid-fee-marketplace-payer-20261002' THEN kind := 'marketplace'; mode := 'payer'; counter_name := 'froto_uat_config_marketplace_payer_20261002';
WHEN 'uat-invalid-fee-tender-overlap-20261002' THEN kind := 'tender'; mode := 'overlap'; counter_name := 'froto_uat_config_tender_overlap_20261002';
WHEN 'uat-invalid-fee-tender-payer-20261002' THEN kind := 'tender'; mode := 'payer'; counter_name := 'froto_uat_config_tender_payer_20261002';
ELSE RETURN NEW; END CASE;
fee_type := CASE WHEN kind = 'tender' THEN 'TENDER_JOB'::"FeeTransactionType" ELSE 'MARKETPLACE_JOB'::"FeeTransactionType" END;
IF NEW.status <> 'AWARDED' THEN RAISE EXCEPTION 'FROTO_UAT_CONFIG_PRECONDITION_FAILED'; END IF;
IF (SELECT count(*) FROM "FeeRule" WHERE "transactionType" = fee_type AND active AND ("effectiveFrom" IS NULL OR "effectiveFrom" <= now()) AND ("effectiveTo" IS NULL OR "effectiveTo" > now())) <> 1 THEN RAISE EXCEPTION 'FROTO_UAT_CONFIG_PRECONDITION_FAILED'; END IF;
SELECT id INTO STRICT rule_id FROM "FeeRule" WHERE "transactionType" = fee_type AND active AND ("effectiveFrom" IS NULL OR "effectiveFrom" <= now()) AND ("effectiveTo" IS NULL OR "effectiveTo" > now());
IF mode = 'overlap' THEN
INSERT INTO "FeeRule" (id,code,version,"transactionType","percentageBps","gstBps","payerType",active,"updatedAt") VALUES ('uat-invalid-rule-' || NEW.id,'UAT_INVALID_OVERLAP_' || kind,1,fee_type,400,1000,'PROVIDER',true,now());
IF (SELECT count(*) FROM "FeeRule" WHERE "transactionType" = fee_type AND active AND ("effectiveFrom" IS NULL OR "effectiveFrom" <= now()) AND ("effectiveTo" IS NULL OR "effectiveTo" > now())) <> 2 THEN RAISE EXCEPTION 'FROTO_UAT_CONFIG_PRECONDITION_FAILED'; END IF;
ELSE
UPDATE "FeeRule" SET "payerType" = 'GUEST',"updatedAt" = now() WHERE id = rule_id;
IF (SELECT "payerType" FROM "FeeRule" WHERE id = rule_id) <> 'GUEST' THEN RAISE EXCEPTION 'FROTO_UAT_CONFIG_PRECONDITION_FAILED'; END IF;
END IF;
PERFORM nextval(counter_name::regclass);
RETURN NEW;
END; $$;
CREATE TRIGGER froto_uat_invalid_fee_20261002 AFTER INSERT ON "Job" FOR EACH ROW EXECUTE FUNCTION froto_uat_invalid_fee_20261002();

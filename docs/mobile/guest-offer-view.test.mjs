import test from 'node:test';
import assert from 'node:assert/strict';
import { projectGuestOffers } from './guest-offer-view.v0.mjs';

const ownerBid = Object.freeze({
  id:'bid-1', amount:400, status:'SUBMITTED', leadTime:'Tomorrow morning',
  serviceDescription:'Two-person pickup', notes:'private',
  company:{name:'Courier A', verified:true, ratingAverage:4.5, reviewCount:12},
});
const owner = (bids=[ownerBid]) => projectGuestOffers({httpStatus:200,payload:{viewerType:'GUEST_OWNER',privacy:'OWNER_CAN_COMPARE_ALL',bids}});
const courier = (ownBid={id:'own-bid',amount:330,status:'SUBMITTED',leadTime:'2 days'}) =>
  projectGuestOffers({httpStatus:200,payload:{viewerType:'COMPANY_BIDDER',privacy:'SEALED',ownBid}});

test('guest owner receives only supported quoted amounts, not customer total',()=>{
  const result=owner(); assert.equal(result.screen,'OWNER_COMPARE_QUOTED_OFFERS');
  assert.equal(result.ownerComparison[0].quotedAmountAud,400);
  assert.equal(result.ownerComparison[0].companyName,'Courier A');
  assert.equal(result.ownerComparison[0].pickupLeadTimeTextNotAgreement,'Tomorrow morning');
  assert.equal('totalPayable' in result.ownerComparison[0],false);
  assert.equal(result.paymentCaptured,false);
});
test('owner with zero offers waits rather than inventing a winner',()=>{
  const result=owner([]); assert.equal(result.screen,'OWNER_WAITING_FOR_OFFERS');
  assert.equal(result.ownerComparison.length,0);
});
test('courier has only own offer and never competitor comparison',()=>{
  const result=courier(); assert.equal(result.screen,'COURIER_OWN_OFFER_ONLY');
  assert.equal(result.ownerComparison.length,0); assert.equal(result.ownOffer.quotedAmountAud,330);
  assert.equal('companyName' in result.ownOffer,false);
});
test('courier with no bid shows no offer without inventing a price',()=>{
  const result=courier(null); assert.equal(result.screen,'COURIER_NO_OFFER');
  assert.equal(result.ownOffer,null);
});
test('unexpected rival bids on courier payload fail closed',()=>{
  const result=projectGuestOffers({httpStatus:200,payload:{viewerType:'COMPANY_BIDDER',privacy:'SEALED',ownBid:{id:'mine',amount:300},bids:[ownerBid]}});
  assert.equal(result.screen,'OFFERS_UNAVAILABLE'); assert.deepEqual(result.ownerComparison,[]);
});
test('owner comparison requires owner-only privacy marker',()=>{
  const result=projectGuestOffers({httpStatus:200,payload:{viewerType:'GUEST_OWNER',privacy:'SEALED',bids:[ownerBid]}});
  assert.equal(result.screen,'OFFERS_UNAVAILABLE');
});
test('unrecognized or absent viewer type fails closed',()=>{
  for(const viewerType of ['ADMIN',null,undefined]){
    assert.equal(projectGuestOffers({httpStatus:200,payload:{viewerType,privacy:'OWNER_CAN_COMPARE_ALL',bids:[ownerBid]}}).screen,'OFFERS_UNAVAILABLE');
  }
});
test('owner malformed amount fails whole list to avoid misleading shortlist',()=>{
  const result=owner([ownerBid,{...ownerBid,id:'bid-2',amount:'NaN'}]);
  assert.equal(result.screen,'RETRY_AUTHORITATIVE_FETCH'); assert.deepEqual(result.ownerComparison,[]);
});
test('courier malformed amount cannot be displayed as valid offer',()=>{
  assert.equal(courier({id:'x',amount:Infinity}).screen,'RETRY_AUTHORITATIVE_FETCH');
});
test('missing ratings remain unknown rather than zero',()=>{
  const result=owner([{...ownerBid,company:{name:'B',verified:false,ratingAverage:null,reviewCount:null}}]);
  assert.equal(result.ownerComparison[0].ratingAverage,null);
  assert.equal(result.ownerComparison[0].reviewCount,null);
});
test('rating outside 0..5 is unknown, not a trusted score',()=>{
  assert.equal(owner([{...ownerBid,company:{name:'C',ratingAverage:9,reviewCount:-1}}]).ownerComparison[0].ratingAverage,null);
});
test('missing backend fields are explicit, not populated with invented values',()=>{
  const r=owner(); for(const field of ['agreedPickupWindow','vehicle','crew','inclusions','customerTotalPayable']){
    assert.ok(r.backendMissingFields.includes(field)); assert.equal(field in r.ownerComparison[0],false);
  }
});
test('401 discards content and requests sign-in',()=>{
  const r=projectGuestOffers({httpStatus:401,payload:{viewerType:'GUEST_OWNER',privacy:'OWNER_CAN_COMPARE_ALL',bids:[ownerBid]}});
  assert.equal(r.screen,'SIGN_IN_AND_REFETCH');assert.deepEqual(r.ownerComparison,[]);
});
test('403 and 404 discard possibly cached payload',()=>{
  for(const code of [403,404]) assert.equal(projectGuestOffers({httpStatus:code,payload:{bids:[ownerBid]}}).screen,'OFFERS_UNAVAILABLE');
});
test('409 requires refetch, no auto-award',()=>{
  assert.equal(projectGuestOffers({httpStatus:409,payload:{bids:[ownerBid]}}).screen,'REFRESH_RECORD');
});
test('5xx/timeout/empty response never shows stale competition',()=>{
  for(const [httpStatus,payload] of [[500,{}],[0,{}],[200,null]]){
    const r=projectGuestOffers({httpStatus,payload});assert.equal(r.screen,'RETRY_AUTHORITATIVE_FETCH');assert.equal(r.ownerComparison.length,0);
  }
});
test('quotation does not claim captured payment or mutation',()=>{
  for(const r of [owner(),owner([]),courier(),courier(null)]){
    assert.equal(r.serverMutationPerformed,false);assert.equal(r.paymentCaptured,false);
    assert.equal(r.completeListingConfirmed,false);
  }
});
test('offer projected fields omit private notes and full server objects',()=>{
  const r=owner();assert.equal(JSON.stringify(r).includes('private'),false);
  assert.equal('notes' in r.ownerComparison[0],false);
});
test('returned objects and arrays are frozen',()=>{
  const r=owner(); assert.ok(Object.isFrozen(r)); assert.ok(Object.isFrozen(r.ownerComparison));
  assert.ok(Object.isFrozen(r.ownerComparison[0])); assert.ok(Object.isFrozen(r.backendMissingFields));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectSingleItemDraft } from './guest-single-item-checklist.v0.mjs';

const complete = () => ({
  itemType: 'FURNITURE', pickupMode: 'SCHEDULED', title: 'Furniture collection',
  itemDescription: 'Sofa', pickupLocation: 'Brisbane QLD', deliveryLocation: 'Ipswich QLD',
  auctionClosesAtUtc: '2026-11-23T01:00:00Z',
  pickupWindowStartUtc: '2026-11-24T01:00:00Z', pickupWindowEndUtc: '2026-11-24T03:00:00Z',
  dimensionsAndWeightConfirmed: true, accessNeedsConfirmed: true, crewAndHandlingConfirmed: true,
  packing: 'ASSEMBLED', cameraPermission: 'GRANTED', locationPermission: 'GRANTED',
});

test('complete synthetic furniture checklist is still never a submission', () => {
  const r = inspectSingleItemDraft(complete());
  assert.equal(r.checklistState, 'COMPLETE_FOR_DESIGN_REVIEW');
  assert.equal(r.allowedToSubmitToBackend, false);
  assert.equal(r.serverMutationPerformed, false);
  assert.equal(r.paymentCaptured, false);
});
test('empty current API fields flagged by exact logical name', () => {
  const r = inspectSingleItemDraft({ ...complete(), title: ' ', itemDescription: '', pickupLocation: null, deliveryLocation: ' ' });
  assert.deepEqual(r.requiredForExistingApi.slice(0, 4), ['TITLE', 'ITEM_DESCRIPTION', 'PICKUP_LOCATION_TEXT', 'DELIVERY_LOCATION_TEXT']);
});
test('invalid auction close instant flagged, no claim it is future', () => {
  const r = inspectSingleItemDraft({ ...complete(), auctionClosesAtUtc: '2026-11-23T12:00:00+10:00' });
  assert.deepEqual(r.requiredForExistingApi, ['VALID_AUCTION_CLOSE_INSTANT']);
});
test('nonexistent UTC date rejected rather than normalized silently', () => {
  const r = inspectSingleItemDraft({ ...complete(), auctionClosesAtUtc: '2026-02-30T01:00:00Z' });
  assert.ok(r.requiredForExistingApi.includes('VALID_AUCTION_CLOSE_INSTANT'));
});
test('today is a request, never an agreed window', () => {
  const r = inspectSingleItemDraft({ ...complete(), pickupMode: 'TODAY' });
  assert.equal(r.pickupTimeAuthority, 'CUSTOMER_REQUEST_ONLY_NOT_AGREED');
});
test('missing pickup interval needs confirmation', () => {
  const r = inspectSingleItemDraft({ ...complete(), pickupWindowStartUtc: null });
  assert.ok(r.proposedDetailsToConfirm.includes('REQUESTED_PICKUP_WINDOW'));
});
test('reversed pickup interval needs confirmation', () => {
  const r = inspectSingleItemDraft({ ...complete(), pickupWindowEndUtc: '2026-11-24T00:00:00Z' });
  assert.ok(r.proposedDetailsToConfirm.includes('REQUESTED_PICKUP_WINDOW'));
});
test('zero-width pickup interval needs confirmation', () => {
  const r = inspectSingleItemDraft({ ...complete(), pickupWindowEndUtc: '2026-11-24T01:00:00Z' });
  assert.ok(r.proposedDetailsToConfirm.includes('REQUESTED_PICKUP_WINDOW'));
});
test('unconfirmed dimensions, crew and access each remain visible', () => {
  const r = inspectSingleItemDraft({ ...complete(), dimensionsAndWeightConfirmed: false, crewAndHandlingConfirmed: false, accessNeedsConfirmed: false });
  assert.deepEqual(r.proposedDetailsToConfirm, ['DIMENSIONS_AND_WEIGHT', 'STAIRS_LIFT_PARKING_AND_CARRY_IN', 'CREW_AND_HANDLING']);
});
test('store collection point and order-ready are distinct requirements', () => {
  const r = inspectSingleItemDraft({ ...complete(), itemType: 'STORE_PICKUP', collectionPoint: '', orderReady: 'UNKNOWN' });
  assert.ok(r.proposedDetailsToConfirm.includes('STORE_COLLECTION_POINT'));
  assert.ok(r.proposedDetailsToConfirm.includes('STORE_ORDER_READY'));
});
test('store ready and collection point clear only store details', () => {
  const r = inspectSingleItemDraft({ ...complete(), itemType: 'STORE_PICKUP', collectionPoint: 'Shop loading desk', orderReady: 'YES' });
  assert.deepEqual(r.proposedDetailsToConfirm, []);
});
test('furniture packed or assembled requires confirmation', () => {
  const r = inspectSingleItemDraft({ ...complete(), packing: 'UNKNOWN' });
  assert.deepEqual(r.proposedDetailsToConfirm, ['FURNITURE_PACKING']);
});
test('other category does not demand packing or store reference', () => {
  const r = inspectSingleItemDraft({ ...complete(), itemType: 'OTHER', packing: 'UNKNOWN' });
  assert.deepEqual(r.proposedDetailsToConfirm, []);
});
test('camera denied uses manual description, does not prevent draft review', () => {
  const r = inspectSingleItemDraft({ ...complete(), cameraPermission: 'DENIED' });
  assert.deepEqual(r.manualFallbacks, ['MANUAL_ITEM_DESCRIPTION_WITHOUT_PHOTO']);
});
test('location denied uses manual address entry', () => {
  const r = inspectSingleItemDraft({ ...complete(), locationPermission: 'DENIED' });
  assert.deepEqual(r.manualFallbacks, ['MANUAL_ADDRESS_ENTRY']);
});
test('both unavailable permissions preserve both fallbacks', () => {
  const r = inspectSingleItemDraft({ ...complete(), locationPermission: 'UNAVAILABLE', cameraPermission: 'UNAVAILABLE' });
  assert.deepEqual(r.manualFallbacks, ['MANUAL_ITEM_DESCRIPTION_WITHOUT_PHOTO', 'MANUAL_ADDRESS_ENTRY']);
});
test('missing permissions are not treated as granted', () => {
  const { cameraPermission, locationPermission, ...f } = complete();
  const r = inspectSingleItemDraft(f);
  assert.equal(r.permissionOrTenantGranted, false);
});
test('unknown pickup type, item kind or permission rejected', () => {
  for (const bad of [{ itemType: 'DELIVERY_DRIVER' }, { pickupMode: 'DISPATCH_NOW' }, { cameraPermission: 'ALWAYS' }, { locationPermission: 'BACKGROUND' }]) {
    assert.throws(() => inspectSingleItemDraft({ ...complete(), ...bad }), RangeError);
  }
});
test('non-object input rejected', () => {
  for (const invalid of [null, 3, [], 'text']) assert.throws(() => inspectSingleItemDraft(invalid), TypeError);
});
test('outputs are frozen and never echo addresses, names or collection codes', () => {
  const f = { ...complete(), title: 'SENSITIVE_PERSON_NAME', pickupLocation: 'PRIVATE_ADDRESS', collectionPoint: 'PRIVATE_COLLECTION_CODE', photos: ['PRIVATE_PHOTO_URL'], card: 'CARD_NUMBER' };
  const r = inspectSingleItemDraft(f);
  assert.ok(Object.isFrozen(r));
  assert.ok(Object.isFrozen(r.requiredForExistingApi));
  assert.ok(Object.isFrozen(r.proposedDetailsToConfirm));
  assert.ok(Object.isFrozen(r.manualFallbacks));
  assert.ok(!JSON.stringify(r).includes('PRIVATE_'));
  assert.ok(!JSON.stringify(r).includes('CARD_NUMBER'));
});
test('never asserts courier coverage, backend structured support or customer funding', () => {
  const r = inspectSingleItemDraft(complete());
  assert.equal(r.courierCoverage, 'NOT_VERIFIED');
  assert.equal(r.backendStructuredFieldsAvailable, false);
  assert.equal(r.customerFunding, 'SANDBOX_DESIGN_ONLY_NOT_ENABLED');
});

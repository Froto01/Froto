// Synthetic design-contract checks only: no network, credentials, app, database or payment provider.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
const spec = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'single-item-mobile-flow.v0.json'), 'utf8'));

test('proposal is not incorrectly labelled as shipped', () => {
  assert.equal(spec.status, 'PROPOSED_DESIGN_ONLY_NOT_IMPLEMENTED');
  assert.equal(spec.target.nativeAppBuilt, false);
  assert.equal(spec.target.frameworkSelected, false);
  assert.match(spec.sourceBackendSha, /^[a-f0-9]{40}$/);
});
test('Australia-first iOS/Android both included', () => {
  assert.equal(spec.target.country, 'AU');
  assert.equal(spec.target.currency, 'AUD');
  assert.deepEqual(spec.target.devices, ['iOS', 'Android']);
});
test('today and later pickup are requests not confirmed bookings', () => {
  assert.deepEqual(spec.customerDraft.pickupChoices, ['TODAY_REQUESTED', 'SCHEDULE_LATER_REQUESTED']);
  assert.match(spec.customerDraft.notes, /not an agreed courier appointment/i);
});
test('structured photo, address, windows and handling remain proposed API gaps', () => {
  for (const name of ['pickupWindowStart','pickupWindowEnd','pickupIanaTimezone','itemPhotos','itemDimensions','accessStairs','accessLift','crewCount','orderReady','flatPacked']) {
    assert.ok(spec.customerDraft.fieldsProposedNotInExistingGuestApi.includes(name), name);
  }
});
test('manual fallback survives location or camera denial', () => {
  assert.match(spec.customerDraft.cameraDeniedFallback, /MANUAL/);
  assert.equal(spec.customerDraft.locationDeniedFallback, 'MANUAL_ADDRESS_ENTRY');
});
test('waiting for offers has explicit no-bid state', () => {
  assert.equal(spec.customerDraft.onNoOffers, 'WAITING_FOR_OFFERS');
  assert.ok(spec.screens.some(x => x.displayState === 'WAITING_FOR_OFFERS'));
});
test('quote comparison is owner-only and preserves sealed-offer privacy', () => {
  assert.equal(spec.privateQuoteComparison.visibleTo, 'GUEST_CUSTOMER_OWNER_ONLY');
  assert.equal(spec.privateQuoteComparison.providerView, 'OWN_OFFER_ONLY');
  assert.equal(spec.privateQuoteComparison.rivalOfferDataExposedToProvider, false);
  for (const x of ['totalPayable','pickupWindow','vehicle','crew','inclusions']) assert.ok(spec.privateQuoteComparison.fieldsProposedNotInExistingBidApi.includes(x));
});
test('post-award collection reference is never pre-award or rival visible', () => {
  assert.equal(spec.privateQuoteComparison.collectionReferenceBeforeAwardVisible, false);
  assert.equal(spec.privateQuoteComparison.collectionReferenceAfterAwardVisibleTo, 'AWARDED_COURIER_ONLY');
});
test('both customer and courier modes have actionable conceptual screens', () => {
  assert.ok(spec.screens.filter(x => x.mode === 'CUSTOMER').length >= 3);
  assert.ok(spec.screens.filter(x => x.mode === 'COURIER').length >= 3);
  assert.ok(spec.screens.every(x => x.nextAction && x.displayState));
});
test('proposed user-facing milestone names not asserted as existing API actions', () => {
  assert.ok(spec.proposedMilestoneDisplayOnly.includes('COLLECTED'));
  assert.ok(spec.existingGuestApiActionsNotToConfuseWithDisplay.includes('START'));
  assert.ok(!spec.existingGuestApiActionsNotToConfuseWithDisplay.includes('COLLECTED'));
});
test('PIN or safe-drop photo plus exceptions do not equate to completion/payment release', () => {
  assert.deepEqual(spec.deliveryEvidenceDesign.modes, ['RECIPIENT_PIN','AGREED_SAFE_DROP_PHOTO']);
  assert.equal(spec.deliveryEvidenceDesign.evidenceAloneConfirmsCompletion, false);
  assert.equal(spec.deliveryEvidenceDesign.evidenceAloneTriggersPaymentRelease, false);
  assert.equal(spec.deliveryEvidenceDesign.requiresAuthorizedCustomerConfirmation, true);
});
test('no PIN or evidence upload failure must produce exception, not silent success', () => {
  assert.ok(spec.deliveryEvidenceDesign.exceptions.includes('MISSING_PIN'));
  assert.ok(spec.deliveryEvidenceDesign.exceptions.includes('EVIDENCE_UPLOAD_FAILED'));
  assert.match(spec.deliveryEvidenceDesign.noPinOrCameraFallback, /REPORT_EXCEPTION/);
});
test('ambiguous network result never auto-retries awards or charges', () => {
  assert.equal(spec.interruptionRecoveryDesign.automaticallyRetryAwardOrCharge, false);
  assert.equal(spec.interruptionRecoveryDesign.idempotencyApiImplemented, false);
  assert.equal(spec.interruptionRecoveryDesign.ambiguousMutationResult, 'FETCH_AUTHORITATIVE_SERVER_STATE_BEFORE_RETRY');
});
test('deep link requires auth and no lock-screen sensitive data', () => {
  assert.equal(spec.deepLinkDesign.notificationBodyShowsPrivateOfferOrCollectionReference, false);
  assert.equal(spec.deepLinkDesign.requiresSessionAndServerSideRoleCheck, true);
  assert.match(spec.deepLinkDesign.signedOutFallback, /RECHECK_ACCESS/);
});
test('payment remains off and cannot be triggered on courier self-report', () => {
  assert.equal(spec.payment.status, 'DESIGN_ONLY_NOT_ENABLED');
  assert.equal(spec.payment.providerSelected, false);
  assert.equal(spec.privateQuoteComparison.chargeAtBidSubmission, false);
  assert.equal(spec.payment.noReleaseOnCourierSelfReport, true);
});
test('recipient link and image-assisted drafts are follow-up not release claims', () => {
  assert.ok(spec.deferredFollowUpFeatures.includes('REVOCABLE_RECIPIENT_PROGRESS_LINK'));
  assert.ok(spec.deferredFollowUpFeatures.includes('PHOTO_ASSISTED_EDITABLE_DRAFT'));
  assert.equal(spec.deepLinkDesign.unverifiedRecipientPublicLinkEnabled, false);
});
test('live GPS, instant dispatch and production card capture explicitly excluded', () => {
  for(const x of ['CONTINUOUS_LIVE_GPS','INSTANT_DISPATCH','PRODUCTION_CARD_CAPTURE']) assert.ok(spec.explicitlyOutOfScopeFirstRelease.includes(x));
});

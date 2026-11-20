// Pure, display-only Australian single-item job draft checklist.
// Not a server validator, API serializer, permission gate or payment integration.
const TYPES = new Set(['STORE_PICKUP', 'FURNITURE', 'OTHER']);
const MODES = new Set(['TODAY', 'SCHEDULED']);
const PERMISSIONS = new Set(['GRANTED', 'DENIED', 'NOT_REQUESTED', 'UNAVAILABLE']);
const READY = new Set(['YES', 'NO', 'UNKNOWN']);
const PACKING = new Set(['FLAT_PACKED', 'ASSEMBLED', 'UNKNOWN']);

function present(value) { return typeof value === 'string' && value.trim().length > 0; }
function utcInstant(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
    ? Date.parse(value) : null;
}
function checked(value, allowed, field) {
  if (!allowed.has(value)) throw new RangeError('Unsupported ' + field);
}

export function inspectSingleItemDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) throw new TypeError('Draft object required');
  checked(draft.itemType, TYPES, 'itemType');
  checked(draft.pickupMode, MODES, 'pickupMode');
  const camera = draft.cameraPermission ?? 'NOT_REQUESTED';
  const location = draft.locationPermission ?? 'NOT_REQUESTED';
  checked(camera, PERMISSIONS, 'cameraPermission');
  checked(location, PERMISSIONS, 'locationPermission');
  const orderReady = draft.orderReady ?? 'UNKNOWN';
  const packing = draft.packing ?? 'UNKNOWN';
  checked(orderReady, READY, 'orderReady');
  checked(packing, PACKING, 'packing');

  const requiredForExistingApi = [];
  for (const [field, key] of [
    ['TITLE', 'title'], ['ITEM_DESCRIPTION', 'itemDescription'],
    ['PICKUP_LOCATION_TEXT', 'pickupLocation'], ['DELIVERY_LOCATION_TEXT', 'deliveryLocation'],
  ]) if (!present(draft[key])) requiredForExistingApi.push(field);
  if (utcInstant(draft.auctionClosesAtUtc) === null) requiredForExistingApi.push('VALID_AUCTION_CLOSE_INSTANT');

  const proposedDetailsToConfirm = [];
  const start = utcInstant(draft.pickupWindowStartUtc);
  const end = utcInstant(draft.pickupWindowEndUtc);
  if (start === null || end === null || end <= start) proposedDetailsToConfirm.push('REQUESTED_PICKUP_WINDOW');
  if (draft.dimensionsAndWeightConfirmed !== true) proposedDetailsToConfirm.push('DIMENSIONS_AND_WEIGHT');
  if (draft.accessNeedsConfirmed !== true) proposedDetailsToConfirm.push('STAIRS_LIFT_PARKING_AND_CARRY_IN');
  if (draft.crewAndHandlingConfirmed !== true) proposedDetailsToConfirm.push('CREW_AND_HANDLING');
  if (draft.itemType === 'STORE_PICKUP') {
    if (!present(draft.collectionPoint)) proposedDetailsToConfirm.push('STORE_COLLECTION_POINT');
    if (orderReady !== 'YES') proposedDetailsToConfirm.push('STORE_ORDER_READY');
  }
  if (draft.itemType === 'FURNITURE' && packing === 'UNKNOWN') proposedDetailsToConfirm.push('FURNITURE_PACKING');

  const manualFallbacks = [];
  if (camera === 'DENIED' || camera === 'UNAVAILABLE') manualFallbacks.push('MANUAL_ITEM_DESCRIPTION_WITHOUT_PHOTO');
  if (location === 'DENIED' || location === 'UNAVAILABLE') manualFallbacks.push('MANUAL_ADDRESS_ENTRY');

  return Object.freeze({
    requiredForExistingApi: Object.freeze(requiredForExistingApi),
    proposedDetailsToConfirm: Object.freeze(proposedDetailsToConfirm),
    manualFallbacks: Object.freeze(manualFallbacks),
    checklistState: requiredForExistingApi.length || proposedDetailsToConfirm.length ? 'NEEDS_REVIEW' : 'COMPLETE_FOR_DESIGN_REVIEW',
    pickupTimeAuthority: 'CUSTOMER_REQUEST_ONLY_NOT_AGREED',
    courierCoverage: 'NOT_VERIFIED',
    backendStructuredFieldsAvailable: false,
    allowedToSubmitToBackend: false,
    permissionOrTenantGranted: false,
    customerFunding: 'SANDBOX_DESIGN_ONLY_NOT_ENABLED',
    paymentCaptured: false,
    serverMutationPerformed: false,
  });
}

/**
 * Froto mobile owner/courier private-offer UI projection, DESIGN ONLY.
 * Synthetic, no auth, API fetch, bid submission, award, charge or data storage.
 * Source: spot-requirements 38627662a93ab6cd7e35a792a46a62de82010904;
 * app/api/guest-auctions/[id]/bids/route.ts; issue #41.
 */
const MISSING = Object.freeze(['agreedPickupWindow', 'vehicle', 'crew', 'inclusions', 'customerTotalPayable']);

const idle = (screen, reason) => Object.freeze({
  screen, reason, ownerComparison: Object.freeze([]), ownOffer: null,
  backendMissingFields: MISSING, serverMutationPerformed: false,
  paymentCaptured: false, completeListingConfirmed: false,
});

function amount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function text(value, max = 200) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function ownOffer(bid) {
  if (!bid || typeof bid !== 'object' || Array.isArray(bid)) return null;
  const quotedAmount = amount(bid.amount);
  if (quotedAmount === null) return null;
  return Object.freeze({
    bidId: text(bid.id, 100), quotedAmountAud: quotedAmount,
    pickupLeadTimeTextNotAgreement: text(bid.leadTime),
    serviceDescription: text(bid.serviceDescription, 500),
    status: text(bid.status, 50),
    // No competing offers, provider fee, payout or payment state.
  });
}

/**
 * Provide ONLY a newly received response from GET /api/guest-auctions/[id]/bids.
 * The backend must enforce identity, record ownership and tenant privacy.
 * A client-provided viewerType is not proof of authorization.
 */
export function projectGuestOffers({ httpStatus, payload }) {
  if (httpStatus === 401) return idle('SIGN_IN_AND_REFETCH', 'SESSION_EXPIRED');
  if (httpStatus === 403 || httpStatus === 404) return idle('OFFERS_UNAVAILABLE', 'NOT_AUTHORIZED_OR_MISSING');
  if (httpStatus === 409) return idle('REFRESH_RECORD', 'STATE_CHANGED');
  if (httpStatus !== 200 || !payload || typeof payload !== 'object') {
    return idle('RETRY_AUTHORITATIVE_FETCH', 'NO_CONFIRMED_SERVER_DATA');
  }
  if (payload.viewerType === 'GUEST_OWNER' && payload.privacy === 'OWNER_CAN_COMPARE_ALL' &&
      Array.isArray(payload.bids)) {
    // Refuse entire unexpected payload rather than drop invalid amounts and present a false shortlist.
    if (payload.bids.some(b => !b || typeof b !== 'object' || amount(b.amount) === null ||
        typeof b.id !== 'string' || typeof b.company?.name !== 'string')) {
      return idle('RETRY_AUTHORITATIVE_FETCH', 'MALFORMED_COMPARISON');
    }
    const comparisons = payload.bids.map(b => Object.freeze({
      bidId: b.id,
      quotedAmountAud: amount(b.amount),
      companyName: text(b.company.name, 120),
      companyVerifiedByServer: b.company.verified === true,
      ratingAverage: typeof b.company.ratingAverage === 'number' &&
        Number.isFinite(b.company.ratingAverage) && b.company.ratingAverage >= 0 &&
        b.company.ratingAverage <= 5 ? b.company.ratingAverage : null,
      reviewCount: Number.isSafeInteger(b.company.reviewCount) && b.company.reviewCount >= 0
        ? b.company.reviewCount : null,
      pickupLeadTimeTextNotAgreement: text(b.leadTime),
      serviceDescription: text(b.serviceDescription, 500),
      // No inferred total payable, confirmed pickup time or payout.
    }));
    return Object.freeze({
      screen: comparisons.length ? 'OWNER_COMPARE_QUOTED_OFFERS' : 'OWNER_WAITING_FOR_OFFERS',
      reason: 'CURRENT_SERVER_RESPONSE_ONLY', ownerComparison: Object.freeze(comparisons),
      ownOffer: null, backendMissingFields: MISSING, serverMutationPerformed: false,
      paymentCaptured: false, completeListingConfirmed: false,
    });
  }
  if (payload.viewerType === 'COMPANY_BIDDER' && payload.privacy === 'SEALED' &&
      !Object.hasOwn(payload, 'bids')) {
    const own = payload.ownBid == null ? null : ownOffer(payload.ownBid);
    if (payload.ownBid != null && own === null) {
      return idle('RETRY_AUTHORITATIVE_FETCH', 'MALFORMED_OWN_OFFER');
    }
    return Object.freeze({
      screen: own ? 'COURIER_OWN_OFFER_ONLY' : 'COURIER_NO_OFFER',
      reason: 'CURRENT_SERVER_RESPONSE_ONLY', ownerComparison: Object.freeze([]),
      ownOffer: own, backendMissingFields: MISSING, serverMutationPerformed: false,
      paymentCaptured: false, completeListingConfirmed: false,
    });
  }
  return idle('OFFERS_UNAVAILABLE', 'UNRECOGNIZED_OR_CONFLICTING_VIEW');
}

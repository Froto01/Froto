/**
 * Design-only native navigation prototype. NOT a route, auth guard, push sender,
 * trusted access decision, or integrated iOS/Android code.
 */
export const GENERIC_PUSH = Object.freeze({
  title: 'Froto update',
  body: 'A job has an update. Sign in to view details.',
});

export function guestJobIntent(webHref) {
  if (typeof webHref !== 'string' || webHref.length > 180) return null;
  // Deliberately narrow allow-list: no URL origins, query, fragment,
  // %-encoding, slash escapes, arbitrary paths or redirect parameters.
  const match = /^\/platform\/guest-auctions\/([A-Za-z0-9_-]{6,80})$/.exec(webHref);
  return match ? Object.freeze({ kind: 'GUEST_JOB', auctionId: match[1] }) : null;
}

/**
 * `serverDetail` must be freshly fetched from GET /api/guest-auctions/[id]
 * under the CURRENT authenticated session, never supplied by a push payload.
 * This prototype CANNOT enforce that premise or validate server authorization.
 */
export function planGuestNotificationOpen({ webHref, authenticated, serverDetail = null }) {
  const intent = guestJobIntent(webHref);
  if (!intent) return { action: 'OPEN_IN_APP_INBOX', reason: 'UNSUPPORTED_OR_UNTRUSTED_LINK' };
  if (!authenticated) return { action: 'SIGN_IN_THEN_REFETCH', auctionId: intent.auctionId };
  if (!serverDetail) return { action: 'FETCH_AUTHORITATIVE_DETAIL', auctionId: intent.auctionId };
  if (serverDetail.httpStatus === 401) return { action: 'SIGN_IN_THEN_REFETCH', auctionId: intent.auctionId };
  if ([403, 404].includes(serverDetail.httpStatus)) return { action: 'OPEN_IN_APP_INBOX', reason: 'NOT_AVAILABLE' };
  if (serverDetail.httpStatus !== 200) return { action: 'SHOW_RETRY_OR_REFRESH', reason: 'UNCONFIRMED_DETAIL' };
  if (serverDetail.auctionId !== intent.auctionId ||
    !['GUEST_OWNER', 'COMPANY_BIDDER'].includes(serverDetail.viewerType)) {
    return { action: 'OPEN_IN_APP_INBOX', reason: 'MISMATCHED_OR_UNKNOWN_VIEWER' };
  }
  return {
    action: 'OPEN_GUEST_JOB',
    auctionId: intent.auctionId,
    view: serverDetail.viewerType === 'GUEST_OWNER' ? 'OWNER_DETAIL' : 'PROVIDER_OWN_DETAIL',
    canRequestComparison: serverDetail.viewerType === 'GUEST_OWNER',
    // No title, address, competing bids, payment info or access code from the push.
  };
}

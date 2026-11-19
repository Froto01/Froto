/**
 * Froto mobile ambiguous-mutation recovery intent, design-only prototype.
 * Not connected to an app, API, auth, storage, payment, queue or retry worker.
 * Owner-approved V2 mobile scope: Froto01/Froto#41; shared backend
 * baseline spot-requirements 38627662a93ab6cd7e35a792a46a62de82010904.
 */
const KINDS = new Set(['CREATE_JOB', 'SUBMIT_PRIVATE_OFFER', 'AWARD_OFFER', 'RECORD_MILESTONE']);
const RESULTS = new Set([
  'NETWORK_TIMEOUT', 'NETWORK_LOST', 'HTTP_2XX', 'HTTP_401', 'HTTP_403',
  'HTTP_404', 'HTTP_409', 'HTTP_5XX',
]);
const IDENTITIES = new Set(['SAME_VIEWER_HINT', 'SIGNED_OUT', 'CHANGED_VIEWER', 'UNKNOWN']);
const LOOKUPS = new Set([
  'NOT_FETCHED', 'AUTHORIZED_RECORD_VISIBLE', 'RECORD_NOT_VISIBLE',
  'ACCESS_DENIED', 'STATE_CONFLICT',
]);

function view(screen, nextSafeAction) {
  return Object.freeze({
    screen, nextSafeAction,
    // No idempotency receipt, server-side replay guard or auth check exists here.
    automaticRetryAllowed: false,
    operationConfirmedByThisPrototype: false,
    serverMutationPerformed: false,
    paymentCaptured: false,
    payoutReleased: false,
    cachedPrivateDataAllowed: false,
  });
}

/**
 * `identity` is a local UI hint, NOT a server-authorized role or tenant.
 * `lookup` means a hypothetical FRESH, server-authorized read in the current
 * identity. This function does not fetch or authenticate it.
 * A visible record is not proof that an ambiguous write succeeded: without a
 * server operation receipt, a prior or competing mutation can look identical.
 */
export function planGuestMutationRecovery({ kind, result, identity, lookup = 'NOT_FETCHED' }) {
  if (!KINDS.has(kind) || !RESULTS.has(result) ||
      !IDENTITIES.has(identity) || !LOOKUPS.has(lookup)) {
    throw new RangeError('Unsupported synthetic mobile mutation outcome');
  }
  if (identity === 'CHANGED_VIEWER' || identity === 'UNKNOWN') {
    return view('DISCARD_PRIVATE_VIEW', 'CLEAR_VIEWER_SCOPED_UI_AND_SIGN_IN_TO_RECHECK');
  }
  if (identity === 'SIGNED_OUT' || result === 'HTTP_401') {
    return view('SESSION_RECHECK', 'SIGN_IN_THEN_FETCH_AUTHORIZED_STATE');
  }
  if (result === 'HTTP_403' || result === 'HTTP_404' || lookup === 'ACCESS_DENIED') {
    return view('RECORD_UNAVAILABLE', 'REMOVE_PRIVATE_DATA_AND_RETURN_TO_AUTHORIZED_LIST');
  }
  if (result === 'HTTP_409' || lookup === 'STATE_CONFLICT') {
    return view('STATE_CHANGED', 'FETCH_AUTHORIZED_STATE_AND_EXPLAIN_CONFLICT');
  }
  if (result === 'HTTP_2XX') {
    // HTTP response alone is not an idempotency or payment receipt.
    return view('RECONCILE_AUTHORITATIVE_RESULT', 'FETCH_CURRENT_AUTHORIZED_RECORD_BEFORE_NEXT_STEP');
  }
  // CREATE has no reliable server operation lookup/receipt after unknown outcome.
  // Never suggest that searching by title or date proves a unique create.
  if (kind === 'CREATE_JOB') {
    return view('CREATE_OUTCOME_UNKNOWN', 'REVIEW_OWN_SERVER_LIST_AND_SEEK_HELP_BEFORE_REPOST');
  }
  if (lookup === 'AUTHORIZED_RECORD_VISIBLE') {
    return view('SERVER_RECORD_VISIBLE_WRITE_UNATTRIBUTED',
      'REVIEW_SERVER_STATUS_WITHOUT_ASSUMING_THE_WRITE_SUCCEEDED');
  }
  if (lookup === 'RECORD_NOT_VISIBLE') {
    return view('SERVER_RECORD_NOT_VISIBLE', 'REFRESH_AUTHORIZED_LIST_AND_SEEK_HELP_NO_AUTO_RETRY');
  }
  return view('WRITE_OUTCOME_UNKNOWN', 'FETCH_AUTHORIZED_SERVER_STATE_NO_AUTO_RETRY');
}

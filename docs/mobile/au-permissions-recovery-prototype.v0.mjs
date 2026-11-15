/**
 * Australia-first Froto mobile UI-state prototype. DESIGN ONLY, not wired to any app,
 * server, permission SDK, auth service or payment provider. No network or secrets.
 * Source reference: Froto01/Froto issue #41 and spot-requirements 38627662a93ab6cd7e35a792a46a62de82010904.
 */
const AU_ZONES = new Set([
  'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Darwin',
  'Australia/Hobart', 'Australia/Melbourne', 'Australia/Perth',
  'Australia/Sydney', 'Australia/Broken_Hill', 'Australia/Lord_Howe',
]);

function utcInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    throw new TypeError('Provide an unambiguous UTC ISO timestamp ending Z');
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 19) !== value.slice(0, 19)) {
    throw new RangeError('Invalid UTC instant');
  }
  return timestamp;
}

export function pickupWindowView({ startUtc, endUtc, timeZone, state, source }) {
  if (!AU_ZONES.has(timeZone)) throw new RangeError('Unsupported Australian IANA timezone');
  const start = utcInstant(startUtc);
  const end = utcInstant(endUtc);
  if (end <= start) throw new RangeError('End must follow start');
  if (state === 'AGREED' && source !== 'SERVER_RECONCILED_AWARD') {
    throw new RangeError('Only an authoritative reconciled award can label a window agreed');
  }
  if (state !== 'REQUESTED' && state !== 'AGREED') throw new RangeError('Unknown window state');
  const format = new Intl.DateTimeFormat('en-AU', {
    timeZone, day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  });
  return Object.freeze({
    label: state === 'AGREED' ? 'AGREED_PICKUP_WINDOW' : 'REQUESTED_PICKUP_WINDOW_NOT_CONFIRMED',
    startLabel: format.format(new Date(start)),
    endLabel: format.format(new Date(end)),
    timeZone,
    // Keeping UTC instants avoids silently interpreting a nonexistent/ambiguous DST wall time.
    startUtc,
    endUtc,
  });
}

const PERMISSION_FALLBACKS = Object.freeze({
  camera: 'MANUAL_ITEM_DESCRIPTION_OR_OPTIONAL_GALLERY',
  location: 'MANUAL_ADDRESS_ENTRY',
  notification: 'IN_APP_INBOX_AND_MANUAL_REFRESH',
});

export function permissionFallback(capability, decision) {
  if (!(capability in PERMISSION_FALLBACKS)) throw new RangeError('Unknown optional capability');
  if (decision === 'GRANTED') return 'CAPABILITY_MAY_BE_USED_IF_BACKEND_READY';
  if (decision === 'DENIED' || decision === 'UNAVAILABLE') return PERMISSION_FALLBACKS[capability];
  if (decision === 'NOT_REQUESTED') return 'EXPLAIN_OPTIONAL_PERMISSION_AND_CONTINUE';
  throw new RangeError('Unknown permission decision');
}

export function mutationRecovery(action, outcome) {
  const actions = new Set(['POST_GUEST_JOB', 'SUBMIT_PRIVATE_OFFER', 'AWARD', 'RECORD_MILESTONE']);
  if (!actions.has(action)) throw new RangeError('Unknown prototype action');
  switch (outcome) {
    case 'NETWORK_TIMEOUT':
    case 'UNKNOWN_RESULT':
      // None of these endpoints has a confirmed mobile idempotency receipt contract.
      return 'FETCH_AUTHORISED_SERVER_STATE_THEN_ASK_BEFORE_RETRY';
    case 'HTTP_409': return 'REFRESH_SERVER_STATE_AND_EXPLAIN_CONFLICT';
    case 'HTTP_401': return 'REAUTHENTICATE_THEN_RECHECK_ACCESS';
    case 'SERVER_CONFIRMED': return 'RENDER_AUTHORITATIVE_SERVER_RESULT';
    default: throw new RangeError('Unknown outcome');
  }
}

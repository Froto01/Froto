/**
 * Froto Australia-first mobile handover UI contract, DESIGN-ONLY and synthetic.
 * No API, authentication, device camera, PIN verification, upload, payments or storage.
 * Issue #41 (14 November addition), baseline spot-requirements 38627662a93ab6cd7e35a792a46a62de82010904.
 */
const VIEWERS = new Set(['GUEST_OWNER', 'WINNING_COMPANY', 'OTHER']);
const STATUSES = new Set(['OPEN', 'AWARDED', 'ACCEPTED', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED']);
const METHODS = new Set(['IN_PERSON_PIN', 'AGREED_SAFE_DROP_PHOTO']);
const PROOFS = new Set(['NONE', 'LOCAL_UNSENT', 'AWAITING_SERVER_RECEIPT', 'SERVER_ACCEPTED']);
const EXCEPTIONS = new Set(['NONE', 'MISSING_PIN', 'RECIPIENT_UNAVAILABLE', 'FAILED_UPLOAD', 'FAILED_PICKUP', 'DAMAGE']);
const OUTCOMES = new Set(['SERVER_CONFIRMED', 'UNKNOWN_RESULT', 'HTTP_401', 'HTTP_403', 'HTTP_409']);

function result(screen, intent) {
  // UI proposal only. This module can never claim a backend mutation or financial release.
  return Object.freeze({ screen, intent, serverMutationPerformed: false, payoutPermitted: false });
}

export function guestHandoverIntent({ viewer, jobStatus, method, proof, exception = 'NONE', response = 'SERVER_CONFIRMED' }) {
  if (!VIEWERS.has(viewer) || !STATUSES.has(jobStatus) || !METHODS.has(method) ||
      !PROOFS.has(proof) || !EXCEPTIONS.has(exception) || !OUTCOMES.has(response)) {
    throw new RangeError('Unrecognized synthetic handover state');
  }
  // This is not access control. A real server must independently authorize each record and action.
  if (viewer === 'OTHER' || response === 'HTTP_403') return result('ACCESS_UNAVAILABLE', 'RETURN_TO_AUTHORIZED_LIST');
  if (response === 'HTTP_401') return result('SESSION_EXPIRED', 'SIGN_IN_THEN_FETCH_AUTHORIZED_RECORD');
  if (response === 'HTTP_409') return result('STATE_CHANGED', 'FETCH_AUTHORIZED_RECORD_BEFORE_ANY_ACTION');
  if (response === 'UNKNOWN_RESULT') return result('OUTCOME_UNKNOWN', 'FETCH_AUTHORIZED_RECORD_NO_AUTOMATIC_RETRY');
  if (exception !== 'NONE') return result('EXCEPTION_REVIEW', 'REPORT_ISSUE_AND_REQUEST_SERVER_REVIEW');
  if (jobStatus === 'COMPLETED') return result('COMPLETED_READ_ONLY', 'VIEW_CONFIRMED_MILESTONE');
  if (jobStatus === 'DELIVERED') {
    return viewer === 'GUEST_OWNER'
      ? result('CUSTOMER_DELIVERY_REVIEW', proof === 'SERVER_ACCEPTED'
        ? 'REVIEW_PROOF_AND_CONFIRM_OR_REPORT_ISSUE'
        : 'REPORT_MISSING_PROOF_OR_REQUEST_REVIEW')
      : result('AWAIT_CUSTOMER_COMPLETION', 'VIEW_SERVER_MILESTONES');
  }
  if (viewer === 'GUEST_OWNER') return result('CUSTOMER_PROGRESS', 'WAIT_FOR_AWARDED_COURIER_UPDATE');
  if (jobStatus !== 'IN_PROGRESS') return result('COURIER_PROGRESS', 'FOLLOW_SERVER_MILESTONE_SEQUENCE');
  if (proof === 'AWAITING_SERVER_RECEIPT') return result('PROOF_RECEIPT_UNKNOWN', 'FETCH_SERVER_PROOF_STATE_NO_AUTOMATIC_UPLOAD');
  if (proof === 'SERVER_ACCEPTED') return result('PROOF_RECORDED', 'REQUEST_DELIVERY_MILESTONE_AFTER_SERVER_CHECK');
  if (proof === 'LOCAL_UNSENT') return result('UNSENT_EVIDENCE', 'PRESERVE_LOCAL_DRAFT_AND_EXPLAIN_SUBMISSION');
  return result('CAPTURE_EVIDENCE', method === 'IN_PERSON_PIN'
    ? 'REQUEST_SERVER_PIN_VERIFICATION_WITHOUT_LOGGING_CODE'
    : 'REQUEST_AUTHORIZED_SAFE_DROP_PHOTO_UPLOAD');
}

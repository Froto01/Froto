/**
 * PROPOSED DESIGN ONLY. Pure mobile UI projection, no camera/device, HTTP, database,
 * provider, photo processing, payment, or security authorization implementation.
 * All dimensions are user-confirmed centimetres and NEVER inferred by this module.
 */
const METHODS = new Set(['manual', 'reference-photo', 'device-depth']);
const validDimensions = (value) => value && typeof value === 'object' &&
  ['length', 'width', 'height'].every((key) =>
    typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] > 0);
const view = (status, message, extra = {}) => Object.freeze({
  status, message, units: 'cm', confirmedDimensionsCm: null,
  approximate: false, needsUserConfirmation: false,
  canUseManualEntry: true, imageUploaded: false, ...extra,
});

export function projectDimensionIntake(input = {}) {
  const method = input.method;
  if (!METHODS.has(method)) return view('CHOOSE_MANUAL_OR_CAPTURE', 'Enter dimensions manually, or choose an optional guided capture.');
  if (method === 'manual') {
    if (!validDimensions(input.dimensionsCm)) return view('MANUAL_ENTRY_REQUIRED', 'Enter all three dimensions in centimetres.');
    if (input.userConfirmed !== true) return view('REVIEW_MANUAL_DIMENSIONS', 'Review and confirm your measurements.', {
      suggestedDimensionsCm: { ...input.dimensionsCm }, needsUserConfirmation: true,
    });
    return view('USER_CONFIRMED_MANUAL', 'Dimensions confirmed by the customer.', {
      confirmedDimensionsCm: { ...input.dimensionsCm }, origin: 'manual',
    });
  }
  // Capture failure and permission rejection always recover through manual entry.
  if (input.cameraPermission !== 'granted') return view('MANUAL_FALLBACK', 'Camera unavailable or declined. Enter measurements manually.');
  if (input.offline === true || input.captureFailed === true) return view('MANUAL_FALLBACK', 'Capture unavailable. Enter measurements manually.');
  if (method === 'device-depth' && input.depthSupported !== true) return view('MANUAL_FALLBACK', 'Device measurement not supported. Enter measurements manually.');
  if (method === 'reference-photo' && (input.referencePresent !== true || input.scaleValidated !== true)) {
    return view('REFERENCE_REQUIRED', 'Use a verified known-size reference, or enter measurements manually.');
  }
  if (method === 'device-depth' && input.scaleValidated !== true) {
    return view('MEASUREMENT_NOT_READY', 'A validated depth measurement is required. Enter measurements manually if unavailable.');
  }
  // No model/SDK here: caller may supply an external *unverified* result for UI review only.
  if (!validDimensions(input.estimatedCm)) return view('MANUAL_FALLBACK', 'No usable measurement suggestion. Enter measurements manually.');
  const proposed = { ...input.estimatedCm };
  if (input.userConfirmed !== true) return view('REVIEW_APPROXIMATE_SUGGESTION', 'Approximate, not verified. Check with a tape measure and correct before continuing.', {
    approximate: true, suggestedDimensionsCm: proposed, needsUserConfirmation: true,
    origin: method,
  });
  // A confirmation is not an accuracy certificate, billing value or vehicle-fit guarantee.
  return view('USER_CONFIRMED_APPROXIMATE', 'Customer confirmed approximate dimensions; not independently verified.', {
    approximate: true, confirmedDimensionsCm: proposed, origin: method,
  });
}

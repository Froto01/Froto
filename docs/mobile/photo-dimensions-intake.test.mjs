import test from 'node:test';
import assert from 'node:assert/strict';
import { projectDimensionIntake } from './photo-dimensions-intake.v0.mjs';
const dims = { length: 60, width: 40, height: 25 };
const ref = { method: 'reference-photo', cameraPermission: 'granted', referencePresent: true, scaleValidated: true, estimatedCm: dims };
const depth = { method: 'device-depth', cameraPermission: 'granted', depthSupported: true, scaleValidated: true, estimatedCm: dims };
test('no method defaults to manual-capable choice, no guessed numbers', () => {
  const r = projectDimensionIntake(); assert.equal(r.status, 'CHOOSE_MANUAL_OR_CAPTURE'); assert.equal(r.confirmedDimensionsCm, null); assert.equal(r.canUseManualEntry, true);
});
test('unknown source never yields a suggestion', () => assert.equal(projectDimensionIntake({method:'single-photo', estimatedCm:dims}).confirmedDimensionsCm, null));
test('manual dimensions without confirmation are only reviewable', () => {
  const r=projectDimensionIntake({method:'manual',dimensionsCm:dims}); assert.equal(r.status,'REVIEW_MANUAL_DIMENSIONS'); assert.equal(r.confirmedDimensionsCm,null);
});
test('manual confirmed valid dimensions can be carried locally', () => {
  const r=projectDimensionIntake({method:'manual',dimensionsCm:dims,userConfirmed:true}); assert.deepEqual(r.confirmedDimensionsCm,dims); assert.equal(r.approximate,false);
});
test('manual missing height must never be confirmed', () => assert.equal(projectDimensionIntake({method:'manual',dimensionsCm:{length:20,width:30},userConfirmed:true}).status,'MANUAL_ENTRY_REQUIRED'));
test('zero or negative sizes are not accepted', () => assert.equal(projectDimensionIntake({method:'manual',dimensionsCm:{...dims,width:-1},userConfirmed:true}).confirmedDimensionsCm,null));
test('NaN and Infinity never become dimensions', () => { for (const v of [NaN,Infinity]) assert.equal(projectDimensionIntake({method:'manual',dimensionsCm:{...dims,width:v},userConfirmed:true}).confirmedDimensionsCm,null); });
test('strings and implied unit conversions never become measurements', () => assert.equal(projectDimensionIntake({method:'manual',dimensionsCm:{...dims,height:'25'},userConfirmed:true}).confirmedDimensionsCm,null));
test('camera denied provides manual fallback without photo upload', () => {
  const r=projectDimensionIntake({...ref,cameraPermission:'denied',userConfirmed:true}); assert.equal(r.status,'MANUAL_FALLBACK'); assert.equal(r.imageUploaded,false); assert.equal(r.confirmedDimensionsCm,null);
});
test('unavailable camera provides manual fallback', () => assert.equal(projectDimensionIntake({...ref,cameraPermission:'unavailable'}).status,'MANUAL_FALLBACK'));
test('offline does not pretend to upload or measure photos', () => assert.equal(projectDimensionIntake({...ref,offline:true}).status,'MANUAL_FALLBACK'));
test('capture failure does not mark a measurement as received', () => assert.equal(projectDimensionIntake({...ref,captureFailed:true}).confirmedDimensionsCm,null));
test('uncalibrated single photo cannot estimate absolute lengths', () => assert.equal(projectDimensionIntake({...ref,scaleValidated:false,userConfirmed:true}).status,'REFERENCE_REQUIRED'));
test('missing known-size reference blocks photo-derived suggestion', () => assert.equal(projectDimensionIntake({...ref,referencePresent:false,userConfirmed:true}).status,'REFERENCE_REQUIRED'));
test('unsupported depth sensor falls back to manual', () => assert.equal(projectDimensionIntake({...depth,depthSupported:false,userConfirmed:true}).status,'MANUAL_FALLBACK'));
test('unvalidated depth reading must not be accepted', () => assert.equal(projectDimensionIntake({...depth,scaleValidated:false,userConfirmed:true}).confirmedDimensionsCm,null));
test('invalid model suggestion cannot be confirmed', () => assert.equal(projectDimensionIntake({...ref,estimatedCm:{length:1,width:2,height:0},userConfirmed:true}).confirmedDimensionsCm,null));
test('calibrated photo suggestion remains approximate until user reviews', () => {
  const r=projectDimensionIntake(ref); assert.equal(r.status,'REVIEW_APPROXIMATE_SUGGESTION'); assert.equal(r.needsUserConfirmation,true); assert.equal(r.confirmedDimensionsCm,null); assert.equal(r.approximate,true);
});
test('depth suggestion remains approximate until user reviews', () => assert.equal(projectDimensionIntake(depth).confirmedDimensionsCm,null));
test('confirmed calibrated-photo estimate remains labelled approximate', () => {
  const r=projectDimensionIntake({...ref,userConfirmed:true}); assert.deepEqual(r.confirmedDimensionsCm,dims); assert.equal(r.approximate,true); assert.equal(r.origin,'reference-photo');
});
test('confirmed depth estimate remains labelled approximate', () => {
  const r=projectDimensionIntake({...depth,userConfirmed:true}); assert.deepEqual(r.confirmedDimensionsCm,dims); assert.equal(r.approximate,true);
});
test('pure output does not imply provider, weight, billing or upload', () => {
  const r=projectDimensionIntake({...ref,userConfirmed:true}); for(const key of ['weight','providerId','payment','cameraUpload','certified','vehicleFit']) assert.equal(key in r,false);
});
test('AU unit is always centimetres across paths', () => { for(const input of [{},{method:'manual',dimensionsCm:dims,userConfirmed:true},ref,depth]) assert.equal(projectDimensionIntake(input).units,'cm'); });

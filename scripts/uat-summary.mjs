import { UAT_MATRIX } from '../lib/uat-matrix.cjs';
import { existsSync, readFileSync } from 'node:fs';
console.log('## Froto automated UAT\n');
if (existsSync('uat-results/preflight.json')) {
  const preflight = JSON.parse(readFileSync('uat-results/preflight.json', 'utf8'));
  if (preflight.status === 'BLOCKED') { console.log('**BLOCKED — browser tests did not run.**\n'); for (const error of preflight.errors) console.log(`- ${error}`); process.exit(1); }
}
if (!existsSync('uat-results/results.json')) { console.log('**INCOMPLETE — no browser results were produced.** Check build, setup and browser installation logs.'); process.exit(1); }
const result = JSON.parse(readFileSync('uat-results/results.json', 'utf8'));
const stats = result.stats;
console.log(`Passed: ${stats.expected}; failed: ${stats.unexpected}; skipped: ${stats.skipped}; flaky: ${stats.flaky}.\n`);
const observed = {};
function visit(suites = []) { for (const suite of suites) { for (const spec of suite.specs ?? []) for (const item of spec.tests ?? []) observed[item.projectName] = (observed[item.projectName] ?? 0) + 1; visit(suite.suites); } }
visit(result.suites);
const matrixIncomplete = Object.entries(UAT_MATRIX).some(([name, count]) => observed[name] !== count) || Object.keys(observed).some(name => !(name in UAT_MATRIX));
console.log('Profile coverage: ' + Object.entries(UAT_MATRIX).map(([name, count]) => `${name} ${observed[name] ?? 0}/${count}`).join('; ') + '\n');
const incomplete = result.errors?.length || stats.unexpected || stats.skipped || stats.flaky || stats.expected !== Object.values(UAT_MATRIX).reduce((a,b)=>a+b,0) || matrixIncomplete;
if (incomplete) process.exitCode = 1;
console.log(incomplete ? '**REVIEW REQUIRED.** An incomplete, empty or skipped run does not establish UAT acceptance.' : '**Executed checks passed.** Review the report for exact scope; this is not a claim that every launch acceptance item has passed.');
console.log('\nDownload the run artifact for the HTML report, screenshots, JSON and JUnit results. Auth state and credentials are excluded.');

if (existsSync('uat-results/optional-coverage.json')) {
  const optional=JSON.parse(readFileSync('uat-results/optional-coverage.json','utf8'));
  console.log(`\nAdditional coverage — deployment smoke: ${optional.deployment.status}; actual email/MFA: ${optional.realAuthentication.status}. BLOCKED coverage is not a pass; see optional-coverage.json for requirements.`);
}

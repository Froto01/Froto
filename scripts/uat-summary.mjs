import { existsSync, readFileSync } from 'node:fs';
console.log('## Froto automated UAT\n');
if (existsSync('uat-results/preflight.json')) {
  const preflight = JSON.parse(readFileSync('uat-results/preflight.json', 'utf8'));
  if (preflight.status === 'BLOCKED') { console.log('**BLOCKED — browser tests did not run.**\n'); for (const error of preflight.errors) console.log(`- ${error}`); process.exit(0); }
}
if (!existsSync('uat-results/results.json')) { console.log('**INCOMPLETE — no browser results were produced.** Check build, setup and browser installation logs.'); process.exit(0); }
const result = JSON.parse(readFileSync('uat-results/results.json', 'utf8'));
const stats = result.stats;
console.log(`Passed: ${stats.expected}; failed: ${stats.unexpected}; skipped: ${stats.skipped}; flaky: ${stats.flaky}.\n`);
console.log(stats.unexpected || stats.skipped || stats.flaky || stats.expected < 5 ? '**REVIEW REQUIRED.** An incomplete, empty or skipped run does not establish UAT acceptance.' : '**Executed checks passed.** Review the report for exact scope; this is not a claim that every launch acceptance item has passed.');
console.log('\nDownload the run artifact for the HTML report, screenshots, JSON and JUnit results. Auth state and credentials are excluded.');

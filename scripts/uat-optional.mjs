import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('uat-results', {recursive:true});
const coverage={checkedAt:new Date().toISOString(), deployment:{status:'BLOCKED'}, realAuthentication:{status:'BLOCKED'}};
const target=process.env.UAT_DEPLOYMENT_URL || 'https://froto-git-spot-requirements-david-froto-project.vercel.app';
try {
  const url=new URL(target);
  if(url.protocol!=='https:'||url.hostname!=='froto-git-spot-requirements-david-froto-project.vercel.app'||url.pathname!=='/'||url.username||url.password||url.search) throw new Error('Only the verified working-branch alias is permitted');
  const checks=[];
  for(const path of ['/','/auth-test','/api/jobs','/api/guest-auctions']) {
    const r=await fetch(new URL(path,url),{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const location=r.headers.get('location');
    if([401,403].includes(r.status)&&path==='/') {coverage.deployment={status:'BLOCKED',target,reason:'Vercel deployment protection requires authorised access',httpStatus:r.status};break;}
    if(location&&/^https:\/\/(?:vercel\.com|vercel\.app)\//.test(location)) {coverage.deployment={status:'BLOCKED',target,reason:'Vercel sign-in/protection redirect; no bypass attempted',httpStatus:r.status};break;}
    if(path.startsWith('/api/')) {if(r.status!==401)throw new Error('Signed-out API smoke check failed');}
    else {if(r.status!==200)throw new Error('Public-page smoke check failed');const body=await r.text();if(!body.includes(path==='/auth-test'?'Welcome to Froto':'Froto'))throw new Error('Expected Froto page content absent');}
    checks.push({path,status:r.status});
    coverage.deployment={status:'PASS',target,scope:'Read-only HTTP smoke of current working-branch alias; no authenticated production actions',checks};
  }
} catch(e) {coverage.deployment={status:'BLOCKED',target,reason:e instanceof Error?e.message:'Deployment request unavailable'};}
const required=['UAT_EMAIL_ADDRESS','UAT_TEST_INBOX_URL','UAT_TEST_INBOX_TOKEN','UAT_MFA_EMAIL','UAT_MFA_PASSWORD','UAT_TOTP_SECRET'];
const missing=required.filter(key=>!process.env[key]);
if(process.env.UAT_REAL_AUTH_ENABLED!=='1'||process.env.UAT_AUTH_FIXTURE_CONFIRMED!=='OWNED_DEVELOPMENT_FIXTURES'||missing.length) {
  coverage.realAuthentication={status:'BLOCKED',reason:'Dedicated owned email inbox and enrolled development MFA fixtures must be configured and explicitly enabled',missing,requiredConfirmations:['UAT_REAL_AUTH_ENABLED=1','UAT_AUTH_FIXTURE_CONFIRMED=OWNED_DEVELOPMENT_FIXTURES'],scope:'Actual email delivery and actual TOTP challenge; existing helper sign-in does not establish either'};
} else {
  const child=spawnSync('npx',['playwright','test','--config=playwright.auth.config.ts'],{stdio:'inherit',env:process.env});
  const reportPath='playwright/.auth/real-auth/results.json';
  let stats;
  if(existsSync(reportPath))stats=JSON.parse(readFileSync(reportPath,'utf8')).stats;
  const pass=child.status===0&&stats?.expected===2&&!stats?.unexpected&&!stats?.skipped&&!stats?.flaky;
  coverage.realAuthentication={status:pass?'PASS':'FAIL',counts:stats?{passed:stats.expected,failed:stats.unexpected,skipped:stats.skipped,flaky:stats.flaky}:null,scope:'Separate actual email OTP and enrolled TOTP browser flows; private auth evidence excluded from uploaded artifacts'};
  if(!pass)process.exitCode=1;
}
writeFileSync('uat-results/optional-coverage.json',JSON.stringify(coverage,null,2));
console.log(`Deployment smoke: ${coverage.deployment.status}; actual email/MFA: ${coverage.realAuthentication.status}. See optional-coverage.json for scope and blockers.`);

import { test, expect, type Page } from '@playwright/test';
import { createClerkClient } from '@clerk/backend';
import { checkUatEnvironment } from '../../lib/uat-safety.cjs';
import { totp } from '../../lib/uat-totp.cjs';
const confirmed=()=>process.env.UAT_REAL_AUTH_ENABLED==='1'&&process.env.UAT_AUTH_FIXTURE_CONFIRMED==='OWNED_DEVELOPMENT_FIXTURES';
async function ownedFixture(address:string,mfa:boolean) {
  if(!confirmed()||checkUatEnvironment().length||!address||address.includes('+clerk_test'))throw new Error('BLOCKED: dedicated owned development auth configuration is required');
  const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY!});
  const users=await clerk.users.getUserList({emailAddress:[address]});
  if(users.data.length!==1||users.data[0].privateMetadata.fixture!=='FROTO_AUTOMATED_UAT_V1'||(mfa&&!users.data[0].totpEnabled)||(!mfa&&users.data[0].totpEnabled))throw new Error('BLOCKED: auth identity must be an owned fixture with the required enrollment');
}
async function begin(page:Page,address:string) {
  await page.goto('/auth-test');await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.locator('input[name="identifier"]').fill(address);
  await page.getByRole('button',{name:/^Continue$/}).click();
}
async function hasSession(page:Page) {
  await expect.poll(()=>page.evaluate(()=>Boolean((window as unknown as {Clerk?:{session?:unknown}}).Clerk?.session)),{timeout:30000}).toBe(true);
}
test('actual email OTP arrives in the dedicated inbox and authenticates',async({page})=>{
  const address=process.env.UAT_EMAIL_ADDRESS!;await ownedFixture(address,false);
  const inbox=new URL(process.env.UAT_TEST_INBOX_URL!);
  if(inbox.protocol!=='https:'||inbox.username||inbox.password)throw new Error('BLOCKED: inbox adapter must use HTTPS and header authentication');
  const started=Date.now();await begin(page,address);
  const input=page.locator('input[autocomplete="one-time-code"]');await expect(input).toBeVisible();
  let code='';
  await expect.poll(async()=>{
    const r=await fetch(inbox,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.UAT_TEST_INBOX_TOKEN}`},body:JSON.stringify({recipient:address,receivedAfter:new Date(started).toISOString()}),signal:AbortSignal.timeout(10000)});
    if(r.status===204)return false;if(!r.ok)throw new Error('Dedicated inbox adapter unavailable');
    const value=await r.json();
    if(value.recipient!==address||Date.parse(value.receivedAt)<started||!/^\d{6}$/.test(value.code)||!value.messageId)return false;
    code=value.code;return true;
  },{timeout:90000,intervals:[3000]}).toBe(true);
  await input.fill(code);const submit=page.getByRole('button',{name:/^(Continue|Verify)$/});if(await submit.count())await submit.click();
  await hasSession(page);
});
test('enrolled TOTP is actually challenged and verified',async({page})=>{
  const address=process.env.UAT_MFA_EMAIL!;await ownedFixture(address,true);await begin(page,address);
  await page.locator('input[name="password"]').fill(process.env.UAT_MFA_PASSWORD!);await page.getByRole('button',{name:/^Continue$/}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {Clerk?:{client?:{signIn?:{status?:string}}}}).Clerk?.client?.signIn?.status),{timeout:30000}).toBe('needs_second_factor');
  // No Clerk testing token or sign-in ticket is injected in this suite.
  await page.locator('input[autocomplete="one-time-code"]').fill(totp(process.env.UAT_TOTP_SECRET!));
  const submit=page.getByRole('button',{name:/^(Continue|Verify)$/});if(await submit.count())await submit.click();
  await hasSession(page);
});

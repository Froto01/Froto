import { expect, type Page, type TestInfo } from '@playwright/test';
import { api, screenshot } from './helpers';
import { db, one, companyId, companyName, readManifest, writeManifest, type FeeRow } from './environment';
export type Kind = 'marketplace' | 'tender';
export type Source = { id: string; close: number; kind: Kind; path: string; award: string; ids: string[] };
// Brisbane has UTC+10 throughout the year. datetime-local inputs contain local wall time.
const local = (time: number) => new Date(time + 10 * 3600000).toISOString().slice(0, 16);
export async function createBusiness(page: Page, kind: Kind): Promise<Source> {
  const manifest = readManifest(); const title = `SIMULATED ${manifest.runId} ${kind}`;
  await page.goto(kind === 'marketplace' ? '/platform/listings/new' : '/platform/tenders/new');
  let id: string; let close: number;
  if (kind === 'marketplace') {
    await page.getByLabel('Listing title', { exact: true }).fill(title);
    await page.getByLabel('Origin', { exact: true }).fill('Brisbane QLD');
    await page.getByLabel('Destination', { exact: true }).fill('Gold Coast QLD');
    await page.getByLabel('Capacity amount', { exact: true }).fill('2');
    await page.getByLabel('Capacity unit', { exact: true }).selectOption('parcels');
    await page.getByLabel('Available from date', { exact: true }).fill(new Date(Date.now()+86400000).toISOString().slice(0,10));
    await page.getByLabel('Available to date', { exact: true }).fill(new Date(Date.now()+172800000).toISOString().slice(0,10));
    await page.getByLabel('Starting bid', { exact: true }).fill('100');
    await page.getByLabel('Minimum bid increment', { exact: true }).fill('10');
    await page.getByLabel('Notes', { exact: true }).fill(manifest.runId);
    close = Math.floor((Date.now()+120000)/60000)*60000;
    await page.getByLabel('Bidding closes').fill(local(close));
    await page.getByRole('button', {name:'Create Listing', exact:true}).click();
    await expect(page.getByText('Listing created', {exact:true})).toBeVisible();
    id = (await one<{id:string}>('SELECT id FROM "Listing" WHERE title=$1 AND notes=$2 AND "companyId"=$3', [title, manifest.runId, companyId('a')])).id;
    manifest.listings.push(id);
  } else {
    await page.getByLabel('Tender title', { exact: true }).fill(title);
    await page.getByLabel('Product / SKU description', { exact: true }).fill('SIMULATED two ambient boxes; no service performed.');
    await page.getByLabel('Monthly or one-off volume', { exact: true }).fill('2 parcels');
    await page.getByLabel('Required delivery date', { exact: true }).fill(new Date(Date.now()+172800000).toISOString().slice(0,10));
    await page.getByLabel('Origin', { exact: true }).fill('Brisbane QLD');
    await page.getByLabel('Destination', { exact: true }).fill('Gold Coast QLD');
    await page.getByLabel('Notes / special requirements', {exact:true}).fill(manifest.runId);
    close = Math.floor((Date.now()+120000)/60000)*60000;
    await page.getByLabel('Response close time').fill(local(close));
    const pending = page.waitForResponse(r=>r.url().endsWith('/api/tenders')&&r.request().method()==='POST');
    await page.getByRole('button', {name:'Publish Tender',exact:true}).click();
    const response=await pending; expect(response.status()).toBe(201); id=(await response.json()).tenderId;
    manifest.tenders.push(id);
  }
  writeManifest(manifest);
  return {id,kind,close,ids:[],path:kind==='marketplace'?`/platform/listing/${id}`:`/platform/tenders/${id}`,award:kind==='marketplace'?`/api/listings/${id}/award`:`/api/tenders/${id}/award`};
}
export async function quote(page: Page, source: Source, amount: number, note: string) {
  await page.goto(source.path);
  const path=source.kind==='marketplace'?`/api/listings/${source.id}/bids`:`/api/tenders/${source.id}/responses`;
  const pending=page.waitForResponse(r=>r.url().endsWith(path)&&r.request().method()==='POST');
  if(source.kind==='marketplace') {
    await page.locator('input[type="number"]').fill(String(amount));
    await page.getByRole('button',{name:'Place bid',exact:true}).click();
  } else {
    await page.getByLabel('Total quote (AUD)').fill(String(amount));
    await page.getByLabel('Service description', {exact:true}).fill(note);
    await page.getByLabel('Notes', {exact:true}).fill(note);
    await page.getByRole('button',{name:'Submit Tender Response',exact:true}).click();
  }
  const response=await pending; expect(response.status()).toBe(201);
  const body=await response.json(); const id=source.kind==='marketplace'?body.bid.id:body.responseId;
  source.ids.push(id); return id as string;
}
export const awardBody=(s:Source,id:string)=>s.kind==='marketplace'?{bidId:id}:{responseId:id};
export async function waitForClose(page:Page, source:Source) {
  expect((await api(page,source.award,awardBody(source,source.ids[0]))).status).toBe(409);
  await expect.poll(()=>Date.now(),{timeout:130000,intervals:[1000]}).toBeGreaterThan(source.close+500);
  await page.goto(source.path);
  expect((await api(page,source.kind==='marketplace'?`/api/listings/${source.id}`:`/api/tenders/${source.id}`)).body.canAward).toBe(true);
}
export async function awardThroughUi(page:Page,source:Source) {
  page.on('dialog',d=>d.accept());
  const pending=page.waitForResponse(r=>r.url().endsWith(source.award)&&r.request().method()==='POST');
  await page.getByRole('button',{name:source.kind==='marketplace'?`Award to ${companyName('b')}`:'Award this response',exact:true}).first().click();
  const response=await pending; expect(response.status()).toBe(200);
  return (await response.json()).jobId as string;
}
export async function reconcileAward(source:Source,jobId:string,winnerId:string) {
  const job=await one<{id:string;buyerCompanyId:string;providerCompanyId:string;amount:string;awardedBidId:string;awardedTenderResponseId:string;status:string}>('SELECT * FROM "Job" WHERE id=$1',[jobId]);
  expect(job.status).toBe('AWARDED');
  expect(source.kind==='marketplace'?job.awardedBidId:job.awardedTenderResponseId).toBe(winnerId);
  const fee=await one<FeeRow>('SELECT * FROM "TransactionFee" WHERE "sourceId"=$1',[jobId]);
  expect(fee.payerCompanyId).toBe(job.providerCompanyId); expect(fee.status).toBe('CALCULATED');
  expect(Number(fee.transactionAmount)).toBe(Number(job.amount));
  expect(Number(fee.feeExGst)).toBe(10); expect(Number(fee.gstAmount)).toBe(1); expect(Number(fee.feeIncGst)).toBe(11);
  const notices=(await db.query<{companyId:string;href:string}>(`SELECT "companyId",href FROM "Notification" WHERE metadata->>'jobId'=$1 AND type=$2`,[jobId,source.kind==='marketplace'?'MARKETPLACE_AWARD_WON':'TENDER_AWARD_WON'])).rows;
  expect(notices).toHaveLength(1); expect(notices[0].companyId).toBe(companyId('b')); expect(notices[0].href).toBe(`/platform/jobs/${jobId}`);
  return job;
}
export async function completeJob(buyer:Page,provider:Page,unrelated:Page,jobId:string,info:TestInfo) {
  expect((await api(unrelated,`/api/jobs/${jobId}`)).status).toBe(403);
  expect((await api(buyer,`/api/jobs/${jobId}/reviews`,{rating:5})).status).toBe(409);
  for(const [actor,wrong,status,label] of [
    [provider,buyer,'ACCEPTED','Accept awarded job'],[provider,buyer,'IN_PROGRESS','Start job'],
    [buyer,provider,'DELIVERED','Submit completion details'],[provider,buyer,'COMPLETED','Confirm completion'],
  ] as const) {
    expect((await api(wrong,`/api/jobs/${jobId}/status`,{status,note:'SIMULATED completion details'})).status).toBe(403);
    await actor.goto(`/platform/jobs/${jobId}`);
    if(status==='DELIVERED') {
      expect((await api(actor,`/api/jobs/${jobId}/status`,{status})).status).toBe(400);
      await actor.getByLabel('Completion details',{exact:true}).fill('SIMULATED completion details; no real service.');
    }
    const pending=actor.waitForResponse(r=>r.url().endsWith(`/api/jobs/${jobId}/status`)&&r.request().method()==='POST');
    await actor.getByRole('button',{name:label,exact:true}).click(); expect((await pending).status()).toBe(200);
    expect((await one<{status:string}>('SELECT status FROM "Job" WHERE id=$1',[jobId])).status).toBe(status);
    expect((await api(actor,`/api/jobs/${jobId}/status`,{status,note:'SIMULATED repeat'})).status).toBe(409);
  }
  const fee=await one<FeeRow>('SELECT * FROM "TransactionFee" WHERE "sourceId"=$1',[jobId]);
  expect(fee.status).toBe('EARNED'); expect(fee.earnedAt).not.toBeNull(); expect(fee.invoicedAt).toBeNull(); expect(fee.paidAt).toBeNull();
  expect(Number((await one<{count:string}>('SELECT count(*) FROM "JobEvent" WHERE "jobId"=$1',[jobId])).count)).toBe(5);
  for(const actor of [buyer,provider]) {
    await actor.goto(`/platform/jobs/${jobId}`);
    await actor.getByRole('radio',{name:'5 stars',exact:true}).click();
    await actor.getByPlaceholder('Optional: describe communication, reliability and the completed service.').fill('SIMULATED automated UAT review; no service performed.');
    const pending=actor.waitForResponse(r=>r.url().endsWith(`/api/jobs/${jobId}/reviews`)&&r.request().method()==='POST');
    await actor.getByRole('button',{name:'Submit verified review',exact:true}).click(); expect((await pending).status()).toBe(201);
    expect((await api(actor,`/api/jobs/${jobId}/reviews`,{rating:5})).status).toBe(409);
  }
  const reviews=(await db.query<{reviewerCompanyId:string;reviewedCompanyId:string;rating:number}>('SELECT * FROM "Review" WHERE "jobId"=$1',[jobId])).rows;
  expect(reviews).toHaveLength(2); expect(reviews.every(r=>r.reviewerCompanyId!==r.reviewedCompanyId&&r.rating===5)).toBe(true);
  expect(Number((await one<{count:string}>(`SELECT count(*) FROM "Notification" WHERE metadata->>'jobId'=$1 AND type='REVIEW_RECEIVED'`,[jobId])).count)).toBe(2);
  await screenshot(provider,info,'completed-business-job');
}

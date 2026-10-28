import { test, expect } from '@playwright/test';
import { api, signedPage, screenshot } from './helpers';
import { closeDatabase, companyId, companyName, readManifest, finishTest } from './environment';
import { createBusiness, quote, waitForClose, awardThroughUi, awardBody, reconcileAward, completeJob, type Kind } from './business-helpers';
test.afterEach(async({},info)=>{await finishTest(info);});
test.afterAll(async()=>{await closeDatabase();});
for(const kind of ['marketplace','tender'] as Kind[]) test(`${kind}: UI creation, privacy, award, lifecycle, two-sided reviews and reconciliation`,async({browser},info)=>{
  test.setTimeout(240000);
  const a=await signedPage(browser,'a');const b=await signedPage(browser,'b');const other=await signedPage(browser,'outsider');
  try {
    const source=await createBusiness(a.page,kind);
    const first=await quote(b.page,source,250,`PRIVATE-B-${readManifest().runId}`);
    await quote(other.page,source,300,`PRIVATE-OTHER-${readManifest().runId}`);
    expect((await api(other.page,source.award,awardBody(source,first))).status).toBe(403);
    await b.page.goto(source.path);
    const detail=await api(b.page,kind==='marketplace'?`/api/listings/${source.id}`:`/api/tenders/${source.id}`);
    expect(detail.status).toBe(200);
    if(kind==='marketplace') {
      const rival=detail.body.bids.find((bid:{id:string})=>bid.id===source.ids[1]);
      expect(rival.bidderCompanyId).toBeNull(); expect(rival.bidderCompanyName).not.toBe(companyName('outsider'));
      expect(detail.body.bids.map((bid:{amount:number})=>bid.amount).sort()).toEqual([250,300]);
    } else {
      expect(detail.body.responses).toHaveLength(1);expect(detail.body.responses[0].companyId).toBe(companyId('b'));
      await expect(b.page.getByText(`PRIVATE-OTHER-${readManifest().runId}`,{exact:true})).toHaveCount(0);
      expect((await api(b.page,`/api/tenders/${source.id}/responses`,{amount:260})).status).toBe(409);
    }
    await screenshot(b.page,info,`${kind}-bid-privacy`);
    await waitForClose(a.page,source);
    const jobId=await awardThroughUi(a.page,source);
    const job=await reconcileAward(source,jobId,first);
    expect(job.buyerCompanyId).toBe(companyId(kind==='marketplace'?'b':'a'));
    expect(job.providerCompanyId).toBe(companyId(kind==='marketplace'?'a':'b'));
    expect(Number(job.amount)).toBe(250);
    expect((await api(a.page,source.award,awardBody(source,first))).status).toBe(409);
    await completeJob(kind==='marketplace'?b.page:a.page,kind==='marketplace'?a.page:b.page,other.page,jobId,info);
  } finally {await Promise.all([a.context.close(),b.context.close(),other.context.close()]);}
});

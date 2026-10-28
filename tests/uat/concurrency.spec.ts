import { test, expect } from '@playwright/test';
import { signedPage, screenshot } from './helpers';
import { db, closeDatabase, one, finishTest } from './environment';
import { createBusiness, quote, waitForClose, awardBody, type Kind } from './business-helpers';
test.afterEach(async({},info)=>{await finishTest(info);});
test.afterAll(async()=>{await closeDatabase();});
for(const kind of ['marketplace','tender'] as Kind[])test(`${kind}: simultaneous awards persist one coherent job and fee`,async({browser},info)=>{
  test.setTimeout(240000);
  const a=await signedPage(browser,'a');const b=await signedPage(browser,'b');const other=await signedPage(browser,'outsider');
  try {
    const source=await createBusiness(a.page,kind);
    await quote(b.page,source,250,'SIMULATED concurrent B');await quote(other.page,source,300,'SIMULATED concurrent other');
    await waitForClose(a.page,source);
    const results=await a.page.evaluate(async({path,bodies})=>Promise.all(bodies.map(async body=>{
      const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      return {status:r.status,body:await r.json()};
    })),{path:source.award,bodies:source.ids.map(id=>awardBody(source,id))});
    expect(results.map(r=>r.status).sort()).toEqual([200,409]);
    const field=kind==='marketplace'?'listingId':'tenderId';
    const jobs=(await db.query<{id:string;providerCompanyId:string;amount:string;awardedBidId:string;awardedTenderResponseId:string}>(`SELECT * FROM "Job" WHERE "${field}"=$1`,[source.id])).rows;
    expect(jobs).toHaveLength(1);const job=jobs[0];
    const fees=(await db.query<{payerCompanyId:string;transactionAmount:string}>('SELECT * FROM "TransactionFee" WHERE "sourceId"=$1',[job.id])).rows;
    expect(fees).toHaveLength(1);expect(fees[0].payerCompanyId).toBe(job.providerCompanyId);expect(fees[0].transactionAmount).toBe(job.amount);
    const sourceTable=kind==='marketplace'?'Listing':'Tender';const winField=kind==='marketplace'?'awardedBidId':'awardedResponseId';
    const winner=await one<Record<string,string>>(`SELECT "${winField}" FROM "${sourceTable}" WHERE id=$1`,[source.id]);
    expect(winner[winField]).toBe(kind==='marketplace'?job.awardedBidId:job.awardedTenderResponseId);
    expect(Number((await one<{count:string}>(`SELECT count(*) FROM "Notification" WHERE metadata->>'jobId'=$1 AND type=$2`,[job.id,kind==='marketplace'?'MARKETPLACE_AWARD_WON':'TENDER_AWARD_WON'])).count)).toBe(1);
    await info.attach('concurrent-business-awards',{body:JSON.stringify({kind,sourceId:source.id,statuses:results.map(r=>r.status),jobId:job.id,winner:winner[winField]}),contentType:'application/json'});
  }catch(error){await Promise.all([a.page,b.page,other.page].map((page,index)=>screenshot(page,info,`failed-race-${kind}-${index}`).catch(()=>{})));throw error;}finally{await Promise.all([a.context.close(),b.context.close(),other.context.close()]);}
});

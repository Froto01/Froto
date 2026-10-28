import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Pool, type QueryResultRow } from 'pg';
import { createClerkClient } from '@clerk/backend';
import { checkUatEnvironment } from '../../lib/uat-safety.cjs';

export const actors = ['guest', 'a', 'b', 'outsider'] as const;
export type Actor = typeof actors[number];
export const tag = 'FROTO_AUTOMATED_UAT_V1';
export const companyId = (actor: Exclude<Actor, 'guest'>) => `auto-uat-company-${actor}`;
export const companyName = (actor: Exclude<Actor, 'guest'>) => `SIMULATED AUTO UAT PROVIDER ${actor.toUpperCase()}`;
export const email = (actor: Actor) => `froto-uat-${actor}+clerk_test@example.com`;
export const authFile = (actor: Actor) => `playwright/.auth/${actor}.json`;
export const db = new Pool({ connectionString: process.env.DATABASE_URL });
export type Manifest = { runId: string; users: Record<Actor, string>; auctions: string[]; requirements: string[] };
export interface AuctionRow extends QueryResultRow { id: string; createdByUserId: string; notes: string | null; title: string; status: string; awardedBidId: string | null }
export interface FeeRow extends QueryResultRow { id: string; payerCompanyId: string; status: string; transactionAmount: string; feeExGst: string; gstAmount: string; feeIncGst: string; earnedAt: Date | null; invoicedAt: Date | null; paidAt: Date | null }
export interface BidRow extends QueryResultRow { id: string; bidderCompanyId: string; status: string; amount: string }
export async function one<T extends QueryResultRow>(sql: string, values: unknown[]): Promise<T> {
  const result = await db.query<T>(sql, values);
  if (result.rows.length !== 1) throw new Error('Expected exactly one database reconciliation row');
  return result.rows[0];
}
export function readManifest(): Manifest { return JSON.parse(readFileSync('playwright/.auth/manifest.json', 'utf8')); }
export function writeManifest(manifest: Manifest) { writeFileSync('playwright/.auth/manifest.json', JSON.stringify(manifest), { mode: 0o600 }); }

export async function seedActors() {
  const errors = checkUatEnvironment();
  if (errors.length) throw new Error(`UAT BLOCKED: ${errors.join('; ')}`);
  const marker = await one<{ marker: string }>("SELECT shobj_description(oid, 'pg_database') AS marker FROM pg_database WHERE datname=current_database()", []);
  if (marker.marker !== 'FROTO_AUTOMATED_UAT_ONLY_V1') throw new Error('UAT database marker absent; no fixture writes permitted');
  mkdirSync('playwright/.auth', { recursive: true, mode: 0o700 });
  const manifest: Manifest = { runId: `AUTO_UAT_${Date.now()}_${randomUUID().slice(0, 8)}`, users: {} as Record<Actor, string>, auctions: [], requirements: [] };
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  for (const actor of actors) {
    const found = await clerk.users.getUserList({ emailAddress: [email(actor)] });
    if (found.data.length > 1) throw new Error('Ambiguous UAT identity');
    const identity = found.data[0] ?? await clerk.users.createUser({ emailAddress: [email(actor)], firstName: 'Froto UAT', lastName: actor, skipPasswordRequirement: true, privateMetadata: { fixture: tag } });
    if (identity.privateMetadata.fixture !== tag) throw new Error('Existing Clerk identity is not an owned UAT fixture');
    const expectedId = `auto-uat-user-${actor}`;
    await db.query('INSERT INTO "User" (id,"clerkId",email,"firstName","lastName","accountType","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,now()) ON CONFLICT ("clerkId") DO NOTHING', [expectedId, identity.id, email(actor), 'Froto UAT', actor, actor === 'guest' ? 'PERSONAL' : 'BUSINESS']);
    const user = await one<{ id: string; email: string }>('SELECT id,email FROM "User" WHERE "clerkId"=$1', [identity.id]);
    if (user.id !== expectedId || user.email !== email(actor)) throw new Error('Existing Froto identity is not the expected UAT fixture');
    manifest.users[actor] = user.id;
    if (actor !== 'guest') {
      await db.query('INSERT INTO "Company" (id,name,notes,"updatedAt") VALUES ($1,$2,$3,now()) ON CONFLICT (id) DO NOTHING', [companyId(actor), companyName(actor), tag]);
      const company = await one<{ notes: string }>('SELECT notes FROM "Company" WHERE id=$1', [companyId(actor)]);
      if (company.notes !== tag) throw new Error('Existing company is not an owned UAT fixture');
      await db.query('INSERT INTO "CompanyMember" (id,"userId","companyId",role) VALUES ($1,$2,$3,\'OWNER\') ON CONFLICT ("userId","companyId") DO NOTHING', [`auto-uat-member-${actor}`, user.id, companyId(actor)]);
    }
    const memberships = (await db.query<{ companyId: string; role: string }>('SELECT "companyId",role FROM "CompanyMember" WHERE "userId"=$1', [user.id])).rows;
    if (actor === 'guest' ? memberships.length !== 0 : memberships.length !== 1 || memberships[0].companyId !== companyId(actor) || memberships[0].role !== 'OWNER') throw new Error('UAT account membership mismatch');
  }
  writeManifest(manifest);
}

export async function cleanupSuccessfulRun() {
  if (checkUatEnvironment().length) throw new Error('Unsafe environment for fixture cleanup');
  const manifest = readManifest();
  const tx = await db.connect();
  try {
    await tx.query('BEGIN');
    for (const id of manifest.auctions) {
      const source = (await tx.query<AuctionRow>('SELECT * FROM "GuestAuction" WHERE id=$1', [id])).rows[0];
      if (!source || source.createdByUserId !== manifest.users.guest || source.notes !== manifest.runId || !source.title.startsWith(`SIMULATED ${manifest.runId}`)) throw new Error('Refusing cleanup outside current owned guest fixtures');
      await tx.query('DELETE FROM "Notification" WHERE metadata->>\'guestAuctionId\'=$1', [id]);
      await tx.query('DELETE FROM "TransactionFee" WHERE "transactionType"=\'GUEST_AUCTION\' AND "sourceId"=$1', [id]);
      await tx.query('DELETE FROM "GuestAuction" WHERE id=$1', [id]);
    }
    for (const id of manifest.requirements) {
      const source = (await tx.query<{ companyId: string; title: string }>('SELECT "companyId",title FROM "SpotRequirement" WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM "Job" WHERE "spotRequirementId"=$1)', [id])).rows[0];
      if (!source || source.companyId !== companyId('a') || !source.title.startsWith(`SIMULATED ${manifest.runId}`)) throw new Error('Refusing cleanup outside current unawarded requirement fixtures');
      await tx.query('DELETE FROM "Notification" WHERE metadata->>\'spotRequirementId\'=$1', [id]);
      await tx.query('DELETE FROM "SpotRequirement" WHERE id=$1', [id]);
    }
    await tx.query('COMMIT');
  } catch (error) { await tx.query('ROLLBACK'); throw error; }
  finally { tx.release(); }
  mkdirSync('uat-results', { recursive: true });
  writeFileSync('uat-results/reconciliation.json', JSON.stringify({ runId: manifest.runId, auctionIds: manifest.auctions, requirementIds: manifest.requirements, cleanup: 'Current owned fixtures removed after successful assertions; fixed test identities retained.' }, null, 2));
}

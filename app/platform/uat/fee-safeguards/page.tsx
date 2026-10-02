import FeePanel from "./test-panel";

export default function FeeSafeguardsPage() {
  return <main className="mx-auto max-w-4xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Fee safeguards UAT</h1>
    <p>Sign in as Froto test company. This checks overlapping fee rules, unsupported payers, unchanged existing snapshots, and duplicate fee creation for marketplace, tender and guest auctions.</p>
    <p>Temporary rule changes are rolled back. Three simulated CALCULATED fee records remain for independent verification. No jobs, invoices or payments are created.</p>
    <FeePanel />
  </main>;
}

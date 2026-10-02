"use client";

import { useRef, useState } from "react";

type Test = { name: string; sourceId: string; url: string; body: Record<string, unknown> };
type Receipt = { sourceId: string; hits: number };
type Result = { name: string; status: number | null; hits: number | null; pass: boolean };

async function readReceipts(): Promise<Receipt[]> {
  const response = await fetch("/api/uat/invalid-fee-award", { cache: "no-store", signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error("Could not read configuration evidence. Check your sign-in before continuing.");
  const data = await response.json() as { receipts: Receipt[] };
  return data.receipts;
}

export default function InvalidFeePanel({ tests }: { tests: Test[] }) {
  const locked = useRef(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    if (locked.current) return;
    locked.current = true;
    setRunning(true);
    try {
      const baseline = await readReceipts();
      if (baseline.length !== tests.length || tests.some(test => baseline.find(item => item.sourceId === test.sourceId)?.hits !== 0)) throw new Error("These fixtures have already been used. Send the existing result for review; do not rerun.");
      for (const test of tests) {
        const response = await fetch(test.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(test.body), signal: AbortSignal.timeout(45000) });
        const rejection = await response.json() as { expectedFailure?: boolean };
        const receipts = await readReceipts();
        const hits = receipts.find(item => item.sourceId === test.sourceId)?.hits ?? null;
        const pass = response.status === 500 && hits === 1 && rejection.expectedFailure === true;
        setResults(previous => [...previous, { name: test.name, status: response.status, hits, pass }]);
        if (!pass) break;
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Check did not finish. Send the screen before retrying."); }
    finally { setRunning(false); }
  }
  return <section className="space-y-4">
    <p>Expected HTTP response: 500, with the existing award handler rejecting the intended invalid configuration. Final database rollback reconciliation is still required.</p>
    <button type="button" disabled={running || results.length > 0 || !!error} onClick={() => void run()} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{running ? `Running ${results.length + 1} of ${tests.length}…` : results.length || error ? "Checks finished" : "Run six invalid-rule awards"}</button>
    <div aria-live="polite">
      {error && <p>{error}</p>}
      {results.length > 0 && <div className="space-y-3"><h2 className="text-xl font-bold">{running ? "Checks in progress" : results.length === tests.length && results.every(result => result.pass) ? "All six invalid-rule awards rejected" : "Result needs review"}</h2>
        <table className="w-full border-collapse text-left text-sm"><thead><tr><th className="border p-2">Check</th><th className="border p-2">HTTP</th><th className="border p-2">Invalid configuration rejected</th></tr></thead><tbody>{results.map(result => <tr key={result.name}><td className="border p-2">{result.name}</td><td className="border p-2">{result.status ?? "No response"}</td><td className="border p-2">{result.pass ? "YES" : `REVIEW (${result.hits ?? "unknown"})`}</td></tr>)}</tbody></table>
        <p>Send the completed screenshot. Do not rerun or manually award these fixtures.</p>
      </div>}
    </div>
  </section>;
}

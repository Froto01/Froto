"use client";

import { useRef, useState } from "react";

type TestCase = { name: string; sourceId: string; url: string; body: Record<string, unknown> };
type Result = { name: string; status: number | null; message: string };

export default function RollbackPanel({ tests }: { tests: TestCase[] }) {
  const locked = useRef(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  async function runTests() {
    if (locked.current) return;
    locked.current = true;
    setRunning(true);
    for (const test of tests) {
      let result: Result;
      try {
        const response = await fetch(test.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(test.body), signal: AbortSignal.timeout(45000) });
        result = { name: test.name, status: response.status, message: response.status === 500 ? "Award failed as expected; rollback verification pending" : "Unexpected result — needs review" };
      } catch (error) {
        result = { name: test.name, status: null, message: error instanceof Error ? error.message : "Request failed" };
      }
      setResults(previous => [...previous, result]);
      if (result.status === 200) break;
    }
    setRunning(false);
  }

  return <main className="mx-auto max-w-4xl space-y-5 p-8">
    <h1 className="text-3xl font-bold">Award rollback UAT</h1>
    <p>Signed in as Froto test company. Six isolated, simulated award attempts will deliberately fail: fee creation and loser notification for spot, marketplace and tender.</p>
    <p className="rounded-xl border border-blue-200 bg-blue-50 p-4">These fixtures have test-only database failure rules. Expected HTTP response: 500 for each attempt. The database must retain the original open source and submissions, with no job, award history, fee or notification left behind.</p>
    <button type="button" disabled={running || results.length > 0} onClick={() => void runTests()} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{running ? `Running ${results.length + 1} of ${tests.length}…` : results.length ? "Test finished" : "Run six rollback checks"}</button>
    <div aria-live="polite">
      {results.length ? <section className="space-y-4">
        <h2 className="text-xl font-bold">{running ? "Checks in progress" : results.length === tests.length && results.every(result => result.status === 500) ? "All six awards failed as expected" : "Result needs review"}</h2>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><caption className="mb-2 text-left">Database rollback confirmation is still required.</caption><thead><tr><th className="border p-3">Check</th><th className="border p-3">HTTP</th><th className="border p-3">Result</th></tr></thead><tbody>{results.map(result => <tr key={result.name}><td className="border p-3">{result.name}</td><td className="border p-3">{result.status ?? "No response"}</td><td className="border p-3">{result.message}</td></tr>)}</tbody></table></div>
        <p>Send a screenshot once all checks finish. Do not rerun or manually award the fixtures.</p>
      </section> : <p>Each check has a 45-second timeout. Tests stop if an award unexpectedly succeeds.</p>}
    </div>
  </main>;
}

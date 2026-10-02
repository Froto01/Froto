"use client";

import { useRef, useState } from "react";

type Report = { runId?: string; complete?: boolean; error?: string; results?: { name: string; pass: boolean; detail: string }[] };

export default function FeePanel() {
  const locked = useRef(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  async function run() {
    if (locked.current) return;
    locked.current = true;
    setRunning(true);
    try {
      const response = await fetch("/api/uat/fee-safeguards", { method: "POST", signal: AbortSignal.timeout(240000) });
      const body = await response.json() as Report;
      setReport(response.ok ? body : { error: body.error ?? "Request failed." });
    } catch {
      setReport({ error: "Request did not finish. Send this screen for investigation before retrying." });
    } finally { setRunning(false); }
  }
  return <section className="space-y-4">
    <button type="button" disabled={running || !!report} onClick={() => void run()} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{running ? "Running checks…" : report ? "Checks finished" : "Run fee safeguards"}</button>
    <div aria-live="polite">
      {running && <p>Keep this page open. Checks can take a few minutes.</p>}
      {report && <div className="space-y-3">
        <h2 className="text-xl font-bold">{report.complete && report.results?.every(result => result.pass) ? "All 12 database checks passed" : "Result needs review"}</h2>
        {report.error && <p>{report.error}</p>}
        {report.runId && <p className="break-all">Run ID: {report.runId}</p>}
        {report.results && <table className="w-full border-collapse text-left text-sm"><thead><tr><th className="border p-2">Check</th><th className="border p-2">Result</th></tr></thead><tbody>{report.results.map(result => <tr key={result.name}><td className="border p-2">{result.name}</td><td className="border p-2">{result.pass ? "PASS" : "REVIEW"}</td></tr>)}</tbody></table>}
        <p>Send a screenshot including the run ID. Independent database reconciliation remains pending.</p>
        <details><summary>Check details</summary><pre className="overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(report, null, 2)}</pre></details>
      </div>}
    </div>
  </section>;
}

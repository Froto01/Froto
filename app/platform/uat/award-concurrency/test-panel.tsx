"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Offer = { id: string; company: string; amount: number };
type Result = { company: string; status: number | null; message: string; jobId: string | null; started: number; finished: number };

export default function AwardConcurrencyTest({ requirementId, offers, awardUrl, selectionKey = "offerId", title = "Simultaneous award UAT" }: { requirementId: string; offers: Offer[]; awardUrl?: string; selectionKey?: "offerId" | "bidId" | "responseId"; title?: string }) {
  const locked = useRef(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);

  async function runTest() {
    if (locked.current) return;
    locked.current = true;
    setRunning(true);
    const origin = performance.now();
    const responses = await Promise.all(offers.map(async offer => {
      const started = Math.round(performance.now() - origin);
      try {
        const response = await fetch(awardUrl ?? `/api/spot-requirements/${requirementId}/award`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [selectionKey]: offer.id, ...(selectionKey === "offerId" ? { closeEarly: true } : {}) }),
          signal: AbortSignal.timeout(45000),
        });
        const body = await response.json() as { error?: string; jobId?: string };
        return { company: offer.company, status: response.status, message: body.error ?? (response.ok ? "Award succeeded" : "Request failed"), jobId: body.jobId ?? null, started, finished: Math.round(performance.now() - origin) };
      } catch (error) {
        return { company: offer.company, status: null, message: error instanceof Error ? error.message : "Request failed", jobId: null, started, finished: Math.round(performance.now() - origin) };
      }
    }));
    setResults(responses);
    setRunning(false);
  }

  const expectedResponses = results?.map(result => result.status).sort().join(",") === "200,409";
  const winner = results?.find(result => result.status === 200);
  return <main className="mx-auto max-w-3xl space-y-6 p-8">
    <h1 className="text-3xl font-bold">{title}</h1>
    <p>Signed in as the posting company: Froto test company.</p>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
      <p className="font-semibold">Isolated, simulated job only</p>
      <p className="mt-2">This sends two award requests together, one for each company. It will award one simulated job and create the applicable test fee snapshot and in-app result notifications. These submissions represent simulated work only.</p>
      <ul className="mt-3 list-disc pl-5">{offers.map(offer => <li key={offer.id}>{offer.company}: {offer.amount.toLocaleString("en-AU", { style: "currency", currency: "AUD" })}</li>)}</ul>
    </div>
    <button type="button" disabled={running || results !== null} onClick={() => void runTest()} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{running ? "Running both requests…" : results ? "Test finished" : "Run two simultaneous awards"}</button>
    <div aria-live="polite">
      {results ? <section className="space-y-4">
        <h2 className="text-xl font-bold">{expectedResponses ? "Expected HTTP result: one success, one conflict" : "Result needs review"}</h2>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
          <caption className="mb-2 text-left">Both requests started without waiting for the other response.</caption>
          <thead><tr><th className="border p-3">Company</th><th className="border p-3">HTTP</th><th className="border p-3">Started / finished</th><th className="border p-3">Result</th></tr></thead>
          <tbody>{results.map(result => <tr key={result.company}><td className="border p-3">{result.company}</td><td className="border p-3">{result.status ?? "No response"}</td><td className="border p-3">{result.started} / {result.finished} ms</td><td className="border p-3">{result.message}</td></tr>)}</tbody>
        </table></div>
        <p>Send a screenshot of this result. Database confirmation of one job, one award event and no duplicate fee snapshot is still required.</p>
        {winner?.jobId ? <Link className="inline-block text-blue-700 underline" href={`/platform/jobs/${winner.jobId}`}>Open the winning simulated job</Link> : null}
        <p className="text-sm text-slate-600">Do not rerun the fixture or progress the job lifecycle.</p>
      </section> : <p>{running ? "Waiting for both responses. Each request has a 45-second timeout." : "Expected: one HTTP 200 response and one HTTP 409 response."}</p>}
    </div>
  </main>;
}

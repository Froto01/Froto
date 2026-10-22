"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateGuestTest() {
  const router = useRouter();
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function create() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/guest-auctions", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ title: "SIMULATED guest transport UAT — 23 October 2026", itemDescription: "Simulated shipment: two securely packed boxes. No actual transport is required.", pickupLocation: "Brisbane QLD", deliveryLocation: "Gold Coast QLD", auctionClosesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), notes: "SIMULATED_GUEST_E2E_UAT_20261023" }),
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error ?? "The test job could not be created.");
      router.push(`/platform/guest-auctions/${payload.id}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request did not finish. Send the screen before retrying.");
      setBusy(false);
    }
  }
  return <section className="space-y-4 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">Create the simulated guest job</h2>
    <p>This posts two packed boxes from Brisbane to the Gold Coast through the normal guest job flow. Bidding stays open for seven days; the guest can confirm an early award after comparing offers. Configured opportunity alerts may be generated when the job is posted.</p>
    <button type="button" disabled={busy || !!error} onClick={() => void create()} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Creating test job…" : "Create simulated guest job"}</button>
    <div aria-live="polite">{error && <p>{error} Reopen this page to check whether the job was created before trying again.</p>}</div>
  </section>;
}

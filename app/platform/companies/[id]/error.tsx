"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CompanyReputationError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-[2rem] border-rose-200 bg-white p-8 shadow-md shadow-froto-navy/5">
          <h1 className="text-2xl font-semibold text-froto-navy">Company reputation could not be loaded</h1>
          <p className="mt-2 text-sm text-slate-500">Try again, or return to the dashboard.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={reset} className="bg-froto-navy hover:bg-[#0a356f]">Try again</Button>
            <Button asChild variant="outline"><Link href="/platform/dashboard">Back to dashboard</Link></Button>
          </div>
        </Card>
      </div>
    </main>
  );
}

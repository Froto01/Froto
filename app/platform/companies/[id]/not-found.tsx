import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function CompanyNotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="rounded-[2rem] border-froto-blue/10 bg-white p-8 shadow-md shadow-froto-navy/5">
          <h1 className="text-2xl font-semibold text-froto-navy">Company profile not found</h1>
          <p className="mt-2 text-sm text-slate-500">This Froto company profile is no longer available.</p>
          <Button asChild className="mt-5 bg-froto-navy hover:bg-[#0a356f]">
            <Link href="/platform/dashboard">Back to dashboard</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}

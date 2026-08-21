import { Card } from "@/components/ui/card";

export default function CompanyReputationLoading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Card className="rounded-[2rem] border-froto-blue/10 bg-white p-8 text-sm text-slate-500 shadow-md shadow-froto-navy/5">
          Loading company reputation...
        </Card>
      </div>
    </main>
  );
}

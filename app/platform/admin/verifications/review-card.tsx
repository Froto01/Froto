"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, CircleX, Clock3 } from "lucide-react";

import { reviewCompanyVerification } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReviewCompany = {
  id: string;
  name: string;
  abn: string | null;
  companyType: string | null;
  locations: string | null;
  notes: string | null;
  verificationSubmittedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Submission time unavailable";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function VerificationReviewCard({ company }: { company: ReviewCompany }) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: "APPROVE" | "REJECT") {
    setMessage(null);

    startTransition(async () => {
      const result = await reviewCompanyVerification({
        companyId: company.id,
        decision,
        note,
      });

      if (!result.success) {
        setMessage(result.error);
        return;
      }

      setMessage(decision === "APPROVE" ? "Company verified." : "Verification rejected with feedback.");
    });
  }

  return (
    <Card className="overflow-hidden rounded-[1.7rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
      <div className="h-1 bg-gradient-to-r from-froto-blue via-froto-teal to-froto-green" />
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl text-froto-navy">{company.name}</CardTitle>
              <Badge className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">
                <Clock3 className="mr-1 h-3.5 w-3.5" />Awaiting review
              </Badge>
            </div>
            <p className="mt-2 text-sm text-slate-500">Submitted {formatDate(company.verificationSubmittedAt)}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["ABN", company.abn || "Not supplied"],
            ["Company type", company.companyType || "Not supplied"],
            ["Locations / lanes", company.locations || "Not supplied"],
            ["Company notes", company.notes || "Not supplied"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/65 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-medium leading-6 text-froto-navy">{value}</dd>
            </div>
          ))}
        </dl>

        <label className="block space-y-2 text-sm font-medium text-froto-navy">
          Review note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional for approval. Required when rejecting so the company knows what to fix."
            className="min-h-24 w-full rounded-xl border border-froto-blue/15 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none placeholder:text-slate-400 focus:border-froto-blue focus:ring-2 focus:ring-froto-blue/10"
          />
        </label>

        {message ? <p className="text-sm font-medium text-froto-navy">{message}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" disabled={isPending} onClick={() => decide("APPROVE")} className="gap-2 bg-froto-green hover:bg-[#1c8d58]">
            <BadgeCheck className="h-4 w-4" />{isPending ? "Reviewing..." : "Approve & verify"}
          </Button>
          <Button type="button" disabled={isPending} onClick={() => decide("REJECT")} variant="outline" className="gap-2 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800">
            <CircleX className="h-4 w-4" />Reject with note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

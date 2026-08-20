"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, Clock3, ShieldCheck } from "lucide-react";

import {
  getCompanyVerificationStatus,
  requestCompanyVerification,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VerificationState = Awaited<ReturnType<typeof getCompanyVerificationStatus>>;

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function VerificationCard() {
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refreshStatus() {
    try {
      const next = await getCompanyVerificationStatus();
      setVerification(next);
      setMessage(null);
    } catch {
      setMessage("Verification status could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function submitVerification() {
    setSubmitting(true);
    setMessage(null);

    try {
      const result = await requestCompanyVerification();

      if (!result.success) {
        setMessage(result.error ?? "Verification could not be submitted.");
        return;
      }

      await refreshStatus();
      setMessage("Verification request submitted for review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Card className="rounded-[1.8rem] border-froto-blue/10 bg-white shadow-sm">
        <CardContent className="p-6 text-sm text-slate-500">Loading verification status...</CardContent>
      </Card>
    );
  }

  if (!verification) {
    return (
      <Card className="rounded-[1.8rem] border-red-100 bg-red-50/70 shadow-sm">
        <CardContent className="p-6 text-sm text-red-700">
          {message ?? "Verification status could not be loaded."}
        </CardContent>
      </Card>
    );
  }

  const status = verification.verified ? "VERIFIED" : verification.verificationStatus;
  const submittedAt = formatDate(verification.verificationSubmittedAt);
  const reviewedAt = formatDate(verification.verificationReviewedAt);

  const statusCopy =
    status === "VERIFIED"
      ? {
          title: "Verified company",
          body: "Your company has completed Froto verification and can display the Verified badge.",
          tone: "border-emerald-100 bg-emerald-50/65",
          icon: <BadgeCheck className="h-5 w-5 text-froto-green" />,
        }
      : status === "SUBMITTED"
        ? {
            title: "Verification submitted",
            body: "Your company details are queued for review. Froto will keep the Verified badge off until review is complete.",
            tone: "border-amber-100 bg-amber-50/60",
            icon: <Clock3 className="h-5 w-5 text-amber-600" />,
          }
        : status === "REJECTED"
          ? {
              title: "Verification needs attention",
              body: "Review the company details below, make any required corrections and submit again when ready.",
              tone: "border-rose-100 bg-rose-50/60",
              icon: <CircleAlert className="h-5 w-5 text-rose-600" />,
            }
          : {
              title: "Company not yet verified",
              body: "Verification adds a trust signal to your marketplace listings, tenders and company activity.",
              tone: "border-blue-100 bg-blue-50/55",
              icon: <ShieldCheck className="h-5 w-5 text-froto-blue" />,
            };

  const canSubmit =
    verification.canRequestVerification &&
    status !== "VERIFIED" &&
    status !== "SUBMITTED";

  return (
    <Card className={`overflow-hidden rounded-[1.8rem] shadow-sm ${statusCopy.tone}`}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {statusCopy.icon}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Company trust
              </p>
              <CardTitle className="mt-1 text-xl text-froto-navy">{statusCopy.title}</CardTitle>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{statusCopy.body}</p>
            </div>
          </div>

          <span className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-semibold text-froto-navy shadow-sm">
            {status === "VERIFIED"
              ? "Verified"
              : status === "SUBMITTED"
                ? "Under review"
                : status === "REJECTED"
                  ? "Action needed"
                  : "Unverified"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company</p>
            <p className="mt-1 text-sm font-medium text-froto-navy">{verification.name}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">ABN</p>
            <p className="mt-1 text-sm font-medium text-froto-navy">{verification.abn || "Not supplied"}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Review activity</p>
            <p className="mt-1 text-sm font-medium text-froto-navy">
              {reviewedAt ? `Reviewed ${reviewedAt}` : submittedAt ? `Submitted ${submittedAt}` : "Not submitted"}
            </p>
          </div>
        </div>

        {verification.verificationNotes ? (
          <div className="rounded-2xl border border-rose-100 bg-white/90 p-4 text-sm text-slate-700">
            <p className="font-semibold text-froto-navy">Review note</p>
            <p className="mt-1 leading-6">{verification.verificationNotes}</p>
          </div>
        ) : null}

        {message ? <p className="text-sm font-medium text-froto-navy">{message}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {canSubmit ? (
            <Button
              type="button"
              onClick={submitVerification}
              disabled={submitting}
              className="bg-froto-navy hover:bg-[#0a356f]"
            >
              {submitting ? "Submitting..." : status === "REJECTED" ? "Resubmit verification" : "Request verification"}
            </Button>
          ) : null}

          {!verification.abn && status !== "VERIFIED" ? (
            <Button asChild variant="outline" className="border-froto-blue/15 bg-white text-froto-navy">
              <Link href="/company/new">ABN required before submission</Link>
            </Button>
          ) : null}

          {!verification.canRequestVerification && status !== "VERIFIED" ? (
            <p className="self-center text-sm text-slate-500">Only a company owner or admin can submit verification.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

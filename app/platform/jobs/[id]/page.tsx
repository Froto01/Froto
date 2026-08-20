"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  PackageCheck,
  PlayCircle,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type JobStatus = "AWARDED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED";

type JobSource =
  | {
      type: "MARKETPLACE";
      id: string;
      title: string;
      location: string;
      capacity: string;
      detail: string | null;
      notes: string | null;
      href: string;
    }
  | {
      type: "TENDER";
      id: string;
      title: string;
      location: string;
      capacity: string;
      detail: string | null;
      notes: string | null;
      href: string;
    };

type JobDetail = {
  id: string;
  amount: number;
  status: JobStatus;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  viewerSide: "BUYER" | "PROVIDER";
  viewerRole: string;
  buyerCompany: { id: string; name: string; verified: boolean };
  providerCompany: { id: string; name: string; verified: boolean };
  source: JobSource;
  events: Array<{
    id: string;
    eventType: string;
    note: string | null;
    createdAt: string;
    actorCompanyName: string | null;
    actorUserName: string | null;
  }>;
};

function formatAUD(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function nextAction(job: JobDetail) {
  if (job.status === "AWARDED" && job.viewerSide === "BUYER") {
    return { status: "ACCEPTED" as const, label: "Accept awarded job", icon: CheckCircle2 };
  }

  if (job.status === "ACCEPTED" && job.viewerSide === "PROVIDER") {
    return { status: "IN_PROGRESS" as const, label: "Start job", icon: PlayCircle };
  }

  if (job.status === "IN_PROGRESS" && job.viewerSide === "PROVIDER") {
    return { status: "COMPLETED" as const, label: "Mark completed", icon: PackageCheck };
  }

  return null;
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`, { cache: "no-store" });
      const data = (await response.json()) as JobDetail & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Job could not be loaded.");
      }

      setJob(data);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Job could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  async function updateStatus(status: JobStatus) {
    setUpdating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const response = await fetch(`/api/jobs/${params.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Job status could not be updated.");
      }

      setActionSuccess(`Job moved to ${statusLabel(status)}.`);
      await loadJob();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Job status could not be updated."
      );
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <Card className="rounded-2xl p-6 text-sm text-slate-500">Loading job...</Card>
        </div>
      </main>
    );
  }

  if (!job || error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <Button asChild variant="outline" className="mb-6">
            <Link href="/platform/dashboard">Back to dashboard</Link>
          </Button>
          <Card className="rounded-2xl p-6 text-sm text-red-700">{error ?? "Job not found."}</Card>
        </div>
      </main>
    );
  }

  const action = nextAction(job);
  const sourceLabel = job.source.type === "TENDER" ? "Tender job" : "Marketplace job";
  const sourceButton = job.source.type === "TENDER" ? "View original tender" : "View original listing";

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <div className="mx-auto max-w-5xl px-4 py-7">
        <Button asChild variant="outline" className="mb-6 gap-2 border-froto-blue/15 bg-white text-froto-navy">
          <Link href="/platform/dashboard">
            <ArrowLeft className="h-4 w-4 text-froto-blue" />
            Back to dashboard
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.8rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
            <CardHeader className="border-b border-froto-blue/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-blue">
                    {sourceLabel}
                  </p>
                  <CardTitle className="mt-2 text-3xl tracking-tight text-froto-navy">{job.source.title}</CardTitle>
                  <p className="mt-2 text-sm font-medium text-froto-teal">{job.source.location}</p>
                </div>
                <Badge className="bg-froto-navy px-3 py-1 text-white">{statusLabel(job.status)}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-froto-blue">Agreed value</p>
                  <p className="mt-1 text-2xl font-semibold text-froto-navy">{formatAUD(job.amount)}</p>
                </div>
                <div className="rounded-2xl bg-teal-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-froto-teal">
                    {job.source.type === "TENDER" ? "Tender requirement" : "Capacity"}
                  </p>
                  <p className="mt-1 font-semibold text-froto-navy">{job.source.capacity}</p>
                  {job.source.detail ? <p className="text-sm text-slate-500">{job.source.detail}</p> : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</p>
                  <p className="mt-1 font-semibold text-froto-navy">{job.buyerCompany.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</p>
                  <p className="mt-1 font-semibold text-froto-navy">{job.providerCompany.name}</p>
                </div>
              </div>

              {job.source.notes ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Job notes</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{job.source.notes}</p>
                </div>
              ) : null}

              <Button asChild variant="outline" className="border-froto-blue/15 text-froto-navy">
                <Link href={job.source.href}>{sourceButton}</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[1.8rem] border-froto-teal/10 bg-white shadow-lg shadow-froto-navy/5">
              <div className="bg-gradient-to-r from-froto-navy via-[#0a4778] to-froto-teal px-6 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Workflow</p>
                <h2 className="mt-1 text-xl font-semibold">Job status</h2>
                <p className="mt-1 text-sm text-white/75">
                  You are viewing this job as the {job.viewerSide === "BUYER" ? "buyer" : "provider"}.
                </p>
              </div>
              <CardContent className="space-y-4 p-6">
                <div className="rounded-2xl bg-froto-ice p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current state</p>
                  <p className="mt-1 text-2xl font-semibold text-froto-navy">{statusLabel(job.status)}</p>
                </div>

                {action ? (
                  <Button className="w-full gap-2 bg-froto-navy hover:bg-[#0a356f]" disabled={updating} onClick={() => void updateStatus(action.status)}>
                    <action.icon className="h-4 w-4" />
                    {updating ? "Updating..." : action.label}
                  </Button>
                ) : job.status === "COMPLETED" ? (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                    <Trophy className="h-4 w-4" />
                    This Froto job is completed.
                  </div>
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
                    The next action belongs to the other company.
                  </p>
                )}

                {actionSuccess ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    {actionSuccess}
                  </div>
                ) : null}
                {actionError ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p> : null}
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] border-froto-blue/10 bg-white shadow-md shadow-froto-navy/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-froto-navy">
                  <Clock3 className="h-5 w-5 text-froto-blue" />
                  Job history
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-froto-navy">{statusLabel(event.eventType)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.actorCompanyName ?? "Froto"}{event.actorUserName ? ` · ${event.actorUserName}` : ""}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                    </div>
                    {event.note ? <p className="mt-2 text-sm text-slate-600">{event.note}</p> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

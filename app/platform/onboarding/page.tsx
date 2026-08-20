"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Truck,
  Warehouse,
} from "lucide-react";
import { updateCompanyProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Role = "Shipper" | "Carrier" | "3PL Warehouse" | "Procurement Team";

type CompanyProfileForm = {
  role: Role;
  locations: string;
  notes: string;
};

const roles: {
  name: Role;
  description: string;
  icon: typeof Truck;
  tone: string;
}[] = [
  {
    name: "Shipper",
    description:
      "Find spare transport and warehouse capacity, place bids, and track tender options.",
    icon: Building2,
    tone: "blue",
  },
  {
    name: "Carrier",
    description:
      "List available lane capacity, receive bids, and fill unused truck space.",
    icon: Truck,
    tone: "teal",
  },
  {
    name: "3PL Warehouse",
    description:
      "Publish pallet positions, storage types, and available warehouse services.",
    icon: Warehouse,
    tone: "green",
  },
  {
    name: "Procurement Team",
    description:
      "Create structured tenders, compare landed cost, and manage supplier responses.",
    icon: ClipboardList,
    tone: "cyan",
  },
];

const emptyForm: CompanyProfileForm = {
  role: "Shipper",
  locations: "",
  notes: "",
};

const roleToneClasses: Record<string, string> = {
  blue: "bg-blue-50 text-froto-blue ring-blue-100",
  teal: "bg-teal-50 text-froto-teal ring-teal-100",
  green: "bg-emerald-50 text-froto-green ring-emerald-100",
  cyan: "bg-cyan-50 text-froto-cyan ring-cyan-100",
};

export default function OnboardingPage() {
  const [form, setForm] = useState<CompanyProfileForm>(emptyForm);
  const [submittedProfile, setSubmittedProfile] =
    useState<CompanyProfileForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field: keyof CompanyProfileForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateCompanyProfile({
        companyType: form.role,
        locations: form.locations,
        notes: form.notes,
      });

      setSubmittedProfile(form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-froto-ice via-slate-50 to-white pb-16">
      <header className="border-b border-froto-blue/10 bg-white/95 shadow-sm shadow-froto-navy/5 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-froto-teal to-froto-green text-white shadow-md shadow-froto-teal/15">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-froto-teal">
                Froto company profile
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-froto-navy">
                Tell Froto how your company operates
              </h1>
            </div>
          </div>

          <Button
            asChild
            variant="outline"
            className="gap-2 border-froto-blue/15 bg-white text-froto-navy"
          >
            <Link href="/platform/dashboard">
              <ArrowLeft className="h-4 w-4 text-froto-blue" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pt-7">
        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-froto-blue">
              Choose your marketplace role
            </p>
            <p className="mt-1 text-sm text-slate-500">
              This helps Froto shape the most relevant capacity, tender and marketplace experience.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = form.role === role.name;

              return (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => updateField("role", role.name)}
                  className={`rounded-[1.6rem] border p-5 text-left shadow-sm transition-all ${
                    isSelected
                      ? "border-froto-blue/25 bg-white shadow-md shadow-froto-navy/5 ring-2 ring-froto-blue/10"
                      : "border-slate-200/80 bg-white/85 hover:-translate-y-0.5 hover:border-froto-blue/15 hover:bg-white"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${roleToneClasses[role.tone]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="mt-4 flex items-center gap-2">
                    <h2 className="font-semibold text-froto-navy">{role.name}</h2>
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-froto-green" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
                </button>
              );
            })}
          </div>
        </section>

        {submittedProfile ? (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-green/15 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-blue via-froto-teal to-froto-green" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-froto-green ring-1 ring-emerald-100">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle className="text-froto-navy">Company profile saved</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    These details are now saved to your Froto company profile.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries({
                  "Company type": submittedProfile.role,
                  "Primary locations / lanes": submittedProfile.locations,
                  Notes: submittedProfile.notes,
                }).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/65 p-4"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-froto-navy">
                      {value || "Not supplied"}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="bg-froto-navy hover:bg-[#0a356f]">
                  <Link href="/platform/dashboard">Go to dashboard</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-froto-teal/15 text-froto-navy"
                  onClick={() => setSubmittedProfile(null)}
                >
                  Edit profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden rounded-[1.8rem] border-froto-blue/10 bg-white shadow-lg shadow-froto-navy/5">
            <div className="h-1.5 bg-gradient-to-r from-froto-blue via-froto-cyan to-froto-green" />
            <CardHeader className="border-b border-froto-blue/10 bg-froto-ice/55">
              <CardTitle className="text-xl text-froto-navy">Company details</CardTitle>
              <p className="text-sm text-slate-500">
                Give Froto enough context to match your company with the right marketplace activity.
              </p>
            </CardHeader>

            <CardContent className="p-6 sm:p-7">
              <form onSubmit={submitProfile} className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Company type
                    <select
                      value={form.role}
                      onChange={(event) => updateField("role", event.target.value)}
                      className="h-9 w-full rounded-md border border-froto-blue/15 bg-white px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-froto-blue focus-visible:ring-[3px] focus-visible:ring-froto-blue/20"
                    >
                      {roles.map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy">
                    Primary locations / lanes
                    <Input
                      required
                      value={form.locations}
                      onChange={(event) => updateField("locations", event.target.value)}
                      placeholder="Sydney to Melbourne, Brisbane chilled storage"
                      className="border-froto-blue/15 bg-white focus-visible:border-froto-blue focus-visible:ring-froto-blue/20"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-froto-navy sm:col-span-2">
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      placeholder="Tell us about your freight profile, storage needs, or tender goals."
                      className="min-h-28 w-full rounded-md border border-froto-blue/15 bg-white px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-froto-blue focus-visible:ring-[3px] focus-visible:ring-froto-blue/20"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 border-t border-froto-blue/10 pt-5 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-froto-navy hover:bg-[#0a356f]"
                  >
                    {isSaving ? "Saving..." : "Save company profile"}
                  </Button>
                  <Button
                    asChild
                    type="button"
                    variant="outline"
                    className="border-froto-blue/15 text-froto-navy"
                  >
                    <Link href="/platform/dashboard">Cancel</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

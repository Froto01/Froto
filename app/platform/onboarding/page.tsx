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
}[] = [
  {
    name: "Shipper",
    description:
      "Find spare transport and warehouse capacity, place bids, and track tender options.",
    icon: Building2,
  },
  {
    name: "Carrier",
    description:
      "List available lane capacity, receive bids, and fill unused truck space.",
    icon: Truck,
  },
  {
    name: "3PL Warehouse",
    description:
      "Publish pallet positions, storage types, and available warehouse services.",
    icon: Warehouse,
  },
  {
    name: "Procurement Team",
    description:
      "Create structured tenders, compare landed cost, and manage supplier responses.",
    icon: ClipboardList,
  },
];

const emptyForm: CompanyProfileForm = {
  role: "Shipper",
  locations: "",
  notes: "",
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
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
              Froto company profile
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
              Tell Froto how your company operates
            </h1>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/platform/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = form.role === role.name;

            return (
              <button
                key={role.name}
                type="button"
                onClick={() => updateField("role", role.name)}
                className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition-colors ${
                  isSelected
                    ? "border-sky-300 bg-sky-50"
                    : "hover:border-sky-200 hover:bg-sky-50/50"
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Icon className="h-5 w-5 text-sky-700" />
                </span>
                <h2 className="mt-4 font-semibold text-neutral-900">
                  {role.name}
                </h2>
                <p className="mt-2 text-sm text-neutral-600">
                  {role.description}
                </p>
              </button>
            );
          })}
        </section>

        {submittedProfile ? (
          <Card className="rounded-3xl border-emerald-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                </span>
                <div>
                  <CardTitle>Company profile saved</CardTitle>
                  <p className="mt-1 text-sm text-neutral-500">
                    These details are now saved to your Froto company profile.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries({
                  "Company type": submittedProfile.role,
                  "Primary locations / lanes": submittedProfile.locations,
                  Notes: submittedProfile.notes,
                }).map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-neutral-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-neutral-900">
                      {value || "Not supplied"}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href="/platform/dashboard">Go to dashboard</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmittedProfile(null)}
                >
                  Edit profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Company profile</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={submitProfile} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Company type
                    <select
                      value={form.role}
                      onChange={(event) =>
                        updateField("role", event.target.value)
                      }
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {roles.map((role) => (
                        <option key={role.name} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Primary locations / lanes
                    <Input
                      required
                      value={form.locations}
                      onChange={(event) =>
                        updateField("locations", event.target.value)
                      }
                      placeholder="Sydney to Melbourne, Brisbane chilled storage"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
                    Notes
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      placeholder="Tell us about your freight profile, storage needs, or tender goals."
                      className="min-h-28 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save company profile"}
                  </Button>
                  <Button asChild type="button" variant="outline">
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

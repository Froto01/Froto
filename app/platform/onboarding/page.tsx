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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Role = "Shipper" | "Carrier" | "3PL Warehouse" | "Procurement Team";

type OnboardingForm = {
  name: string;
  company: string;
  email: string;
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

const emptyForm: OnboardingForm = {
  name: "",
  company: "",
  email: "",
  role: "Shipper",
  locations: "",
  notes: "",
};

export default function OnboardingPage() {
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [submittedProfile, setSubmittedProfile] =
    useState<OnboardingForm | null>(null);

  function updateField(field: keyof OnboardingForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedProfile(form);
  }

  return (
    <main className="min-h-screen bg-neutral-50 pb-16">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
              Froto onboarding
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
              Choose how you use Froto
            </h1>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href="/platform">
              <ArrowLeft className="h-4 w-4" />
              Back to platform
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
                  <CardTitle>Onboarding profile saved in demo mode</CardTitle>
                  <p className="mt-1 text-sm text-neutral-500">
                    No account, auth, or database has been created yet.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2">
                {Object.entries({
                  Name: submittedProfile.name,
                  Company: submittedProfile.company,
                  Email: submittedProfile.email,
                  Role: submittedProfile.role,
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
                  onClick={() => {
                    setForm(emptyForm);
                    setSubmittedProfile(null);
                  }}
                >
                  Start another profile
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Your profile</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={submitProfile} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Name
                    <Input
                      required
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      placeholder="Alex Smith"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Company
                    <Input
                      required
                      value={form.company}
                      onChange={(event) =>
                        updateField("company", event.target.value)
                      }
                      placeholder="Acme Logistics"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Email
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder="alex@company.com"
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-neutral-700">
                    Role
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

                  <label className="space-y-2 text-sm font-medium text-neutral-700 sm:col-span-2">
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
                  <Button type="submit">Complete onboarding</Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/platform">Cancel</Link>
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

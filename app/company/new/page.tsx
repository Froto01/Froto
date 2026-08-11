import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function NewCompanyPage() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    redirect("/auth-test");
  }

  const frotoUser = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      companies: true,
    },
  });

  if (!frotoUser) {
    redirect("/user-sync");
  }

  async function createCompany(formData: FormData) {
    "use server";

    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated || !userId) {
      redirect("/auth-test");
    }

    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    });

    if (!user) {
      redirect("/user-sync");
    }

    const name = String(formData.get("name") ?? "").trim();
    const abnInput = String(formData.get("abn") ?? "").trim();

    if (!name) {
      throw new Error("Company name is required.");
    }

    await prisma.company.create({
      data: {
        name,
        abn: abnInput || null,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });

    redirect("/platform/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-sky-600">FROTO</p>

        <h1 className="mt-2 text-3xl font-bold">
          Create your company
        </h1>

        <p className="mt-3 text-slate-600">
          Set up the business you will use to participate in the Froto
          marketplace.
        </p>

        <form action={createCompany} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700"
            >
              Company name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              placeholder="Example Logistics Pty Ltd"
            />
          </div>

          <div>
            <label
              htmlFor="abn"
              className="block text-sm font-medium text-slate-700"
            >
              ABN
            </label>

            <input
              id="abn"
              name="abn"
              type="text"
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
              placeholder="Optional for now"
            />

            <p className="mt-2 text-xs text-slate-500">
              We can verify company details later.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white"
          >
            Create company
          </button>
        </form>
      </div>
    </main>
  );
}
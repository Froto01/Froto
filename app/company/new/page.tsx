import Image from "next/image";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_28%),#f8fafc] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10">
        <Image
          src="/brand/froto-logo.svg"
          alt="Froto. Connect. Match. Move."
          width={215}
          height={55}
          priority
          className="h-14 w-auto"
        />

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
          Create your company
        </h1>

        <p className="mt-3 text-slate-600">
          Set up the business you will use to participate in the Froto marketplace.
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
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Optional for now"
            />

            <p className="mt-2 text-xs text-slate-500">
              Company verification can be completed later.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#062856] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#0a356f]"
          >
            Create company
          </button>
        </form>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Connect. Match. Move.
        </p>
      </div>
    </main>
  );
}
import Image from "next/image";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function UserSyncPage() {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    redirect("/auth-test");
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    redirect("/auth-test");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Signed-in Clerk user has no email address.");
  }

  const user = await prisma.user.upsert({
    where: {
      clerkId: clerkUser.id,
    },
    update: {
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
    create: {
      clerkId: clerkUser.id,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_32%),#f8fafc] px-6 py-16">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10">
        <Image
          src="/brand/froto-logo.svg"
          alt="Froto. Connect. Match. Move."
          width={210}
          height={54}
          priority
          className="h-13 w-auto"
        />

        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-950">
          Your Froto account is ready
        </h1>

        <p className="mt-4 text-slate-600">
          Your authenticated account is linked to Froto and ready for company setup.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl border bg-slate-50/70 p-5 text-sm text-slate-700">
          <p>
            <strong>Email:</strong> {user.email}
          </p>

          <p>
            <strong>Name:</strong>{" "}
            {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
              "Not supplied"}
          </p>
        </div>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Connect. Match. Move.
        </p>
      </div>
    </main>
  );
}
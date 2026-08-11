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
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">Froto User Sync</h1>

        <p className="mt-4 text-slate-600">
          Your authenticated Clerk account is now linked to Froto.
        </p>

        <div className="mt-8 space-y-2">
          <p>
            <strong>Email:</strong> {user.email}
          </p>

          <p>
            <strong>Name:</strong>{" "}
            {[user.firstName, user.lastName].filter(Boolean).join(" ") ||
              "Not supplied"}
          </p>

          <p>
            <strong>Froto User ID:</strong> {user.id}
          </p>
        </div>
      </div>
    </main>
  );
}
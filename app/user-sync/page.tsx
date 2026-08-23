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

  await prisma.user.upsert({
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

  redirect("/start");
}

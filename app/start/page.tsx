import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function StartPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth-test");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      companies: true,
    },
  });

  if (!user) {
    redirect("/user-sync");
  }

  if (user.companies.length === 0) {
    redirect("/company/new");
  }

  redirect("/platform/dashboard");
}
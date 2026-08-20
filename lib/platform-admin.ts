import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export async function requirePlatformAdmin() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth-test");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    redirect("/user-sync");
  }

  if (user.platformRole !== "PLATFORM_ADMIN") {
    redirect("/platform/dashboard");
  }

  return user;
}

"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

type CompanyProfileInput = {
  companyType: string;
  locations: string;
  notes: string;
};

export async function updateCompanyProfile(input: CompanyProfileInput) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/auth-test");
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      companies: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/user-sync");
  }

  const membership = user.companies[0];

  if (!membership) {
    redirect("/company/new");
  }

  await prisma.company.update({
    where: {
      id: membership.companyId,
    },
    data: {
      companyType: input.companyType,
      locations: input.locations,
      notes: input.notes,
    },
  });

  return {
    success: true,
  };
}
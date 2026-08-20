"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

type CompanyProfileInput = {
  companyType: string;
  locations: string;
  notes: string;
  abn?: string;
};

async function getCurrentMembership() {
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

  return membership;
}

export async function updateCompanyProfile(input: CompanyProfileInput) {
  const membership = await getCurrentMembership();
  const abn = input.abn?.trim();

  await prisma.company.update({
    where: {
      id: membership.companyId,
    },
    data: {
      companyType: input.companyType,
      locations: input.locations,
      notes: input.notes,
      ...(abn ? { abn } : {}),
    },
  });

  return {
    success: true,
  };
}

export async function getCompanyVerificationStatus() {
  const membership = await getCurrentMembership();

  const company = await prisma.company.findUnique({
    where: {
      id: membership.companyId,
    },
    select: {
      name: true,
      abn: true,
      verified: true,
      verificationStatus: true,
      verificationSubmittedAt: true,
      verificationReviewedAt: true,
      verificationNotes: true,
    },
  });

  if (!company) {
    throw new Error("Company could not be found.");
  }

  return {
    ...company,
    verificationSubmittedAt: company.verificationSubmittedAt?.toISOString() ?? null,
    verificationReviewedAt: company.verificationReviewedAt?.toISOString() ?? null,
    canRequestVerification: membership.role === "OWNER" || membership.role === "ADMIN",
  };
}

export async function requestCompanyVerification() {
  const membership = await getCurrentMembership();

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return {
      success: false,
      error: "Only a company owner or admin can request verification.",
    };
  }

  const company = await prisma.company.findUnique({
    where: {
      id: membership.companyId,
    },
    select: {
      abn: true,
      verified: true,
      verificationStatus: true,
    },
  });

  if (!company) {
    return {
      success: false,
      error: "Company could not be found.",
    };
  }

  if (company.verified || company.verificationStatus === "VERIFIED") {
    return {
      success: false,
      error: "This company is already verified.",
    };
  }

  if (company.verificationStatus === "SUBMITTED") {
    return {
      success: false,
      error: "Verification has already been submitted for review.",
    };
  }

  if (!company.abn?.trim()) {
    return {
      success: false,
      error: "Add your ABN in Company details before requesting verification.",
    };
  }

  const updated = await prisma.company.update({
    where: {
      id: membership.companyId,
    },
    data: {
      verified: false,
      verificationStatus: "SUBMITTED",
      verificationSubmittedAt: new Date(),
      verificationReviewedAt: null,
      verificationNotes: null,
    },
    select: {
      verificationStatus: true,
      verificationSubmittedAt: true,
    },
  });

  return {
    success: true,
    verificationStatus: updated.verificationStatus,
    verificationSubmittedAt: updated.verificationSubmittedAt?.toISOString() ?? null,
  };
}

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

function normalizeAbn(value: string) {
  return value.replace(/\D/g, "");
}

function isValidAbn(value: string) {
  const digits = normalizeAbn(value).split("").map(Number);

  if (digits.length !== 11) return false;

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  digits[0] -= 1;

  return digits.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 89 === 0;
}

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
  const suppliedAbn = input.abn?.trim();
  const abn = suppliedAbn ? normalizeAbn(suppliedAbn) : null;

  if (abn && !isValidAbn(abn)) {
    return {
      success: false,
      error: "Enter a valid 11-digit Australian Business Number (ABN).",
    } as const;
  }

  if (abn && abn !== membership.company.abn) {
    const existingCompany = await prisma.company.findUnique({
      where: { abn },
      select: { id: true },
    });

    if (existingCompany && existingCompany.id !== membership.companyId) {
      return {
        success: false,
        error: "That ABN is already connected to another Froto company.",
      } as const;
    }
  }

  const abnChanged = Boolean(abn && abn !== membership.company.abn);

  await prisma.company.update({
    where: {
      id: membership.companyId,
    },
    data: {
      companyType: input.companyType,
      locations: input.locations,
      notes: input.notes,
      ...(abn ? { abn } : {}),
      ...(abnChanged
        ? {
            verified: false,
            verificationStatus: "UNVERIFIED",
            verificationSubmittedAt: null,
            verificationReviewedAt: null,
            verificationReviewedByUserId: null,
            verificationNotes: null,
          }
        : {}),
    },
  });

  return {
    success: true,
  } as const;
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

  if (!isValidAbn(company.abn)) {
    return {
      success: false,
      error: "Add a valid 11-digit Australian Business Number (ABN) before requesting verification.",
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

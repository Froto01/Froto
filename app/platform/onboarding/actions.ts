"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

type CompanyProfileInput = {
  companyType: string;
  locations: string;
  notes: string;
  abn?: string;
  acn?: string;
};

function normalizeNumber(value: string) {
  return value.replace(/\D/g, "");
}

function isValidAbn(value: string) {
  const digits = normalizeNumber(value).split("").map(Number);

  if (digits.length !== 11) return false;

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  digits[0] -= 1;

  return digits.reduce((sum, digit, index) => sum + digit * weights[index], 0) % 89 === 0;
}

function isValidAcn(value: string) {
  const digits = normalizeNumber(value).split("").map(Number);

  if (digits.length !== 9) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  const sum = digits.slice(0, 8).reduce((total, digit, index) => total + digit * weights[index], 0);
  const checkDigit = (10 - (sum % 10)) % 10;

  return digits[8] === checkDigit;
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
  const suppliedAcn = input.acn?.trim();
  const abn = suppliedAbn ? normalizeNumber(suppliedAbn) : null;
  const acn = suppliedAcn ? normalizeNumber(suppliedAcn) : null;

  if (abn && !isValidAbn(abn)) {
    return {
      success: false,
      error: "Enter a valid 11-digit Australian Business Number (ABN).",
    } as const;
  }

  if (acn && !isValidAcn(acn)) {
    return {
      success: false,
      error: "Enter a valid 9-digit Australian Company Number (ACN).",
    } as const;
  }

  const abnChanged = Boolean(abn && abn !== membership.company.abn);
  const acnChanged = Boolean(acn && acn !== membership.company.acn);
  const identityChanged = abnChanged || acnChanged;
  const canEditIdentity = membership.role === "OWNER" || membership.role === "ADMIN";

  if (identityChanged && !canEditIdentity) {
    return {
      success: false,
      error: "Only a company owner or admin can change ABN or ACN details.",
    } as const;
  }

  if (abnChanged) {
    const existingCompany = await prisma.company.findUnique({
      where: { abn: abn! },
      select: { id: true },
    });

    if (existingCompany && existingCompany.id !== membership.companyId) {
      return {
        success: false,
        error: "That ABN is already connected to another Froto company.",
      } as const;
    }
  }

  if (acnChanged) {
    const existingCompany = await prisma.company.findUnique({
      where: { acn: acn! },
      select: { id: true },
    });

    if (existingCompany && existingCompany.id !== membership.companyId) {
      return {
        success: false,
        error: "That ACN is already connected to another Froto company.",
      } as const;
    }
  }

  await prisma.company.update({
    where: {
      id: membership.companyId,
    },
    data: {
      companyType: input.companyType,
      locations: input.locations,
      notes: input.notes,
      ...(abn ? { abn } : {}),
      ...(acn ? { acn } : {}),
      ...(identityChanged
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
      acn: true,
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
    abnValid: Boolean(company.abn && isValidAbn(company.abn)),
    acnValid: Boolean(company.acn && isValidAcn(company.acn)),
    verificationSubmittedAt: company.verificationSubmittedAt?.toISOString() ?? null,
    verificationReviewedAt: company.verificationReviewedAt?.toISOString() ?? null,
    canRequestVerification: membership.role === "OWNER" || membership.role === "ADMIN",
    canEditCompanyIdentity: membership.role === "OWNER" || membership.role === "ADMIN",
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
      acn: true,
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

  const hasAbn = Boolean(company.abn?.trim());
  const hasAcn = Boolean(company.acn?.trim());

  if (!hasAbn && !hasAcn) {
    return {
      success: false,
      error: "Add a valid ABN or ACN in Company details before requesting verification.",
    };
  }

  if (hasAbn && !isValidAbn(company.abn!)) {
    return {
      success: false,
      error: "Correct the saved ABN before requesting verification.",
    };
  }

  if (hasAcn && !isValidAcn(company.acn!)) {
    return {
      success: false,
      error: "Correct the saved ACN before requesting verification.",
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const submittedCompany = await tx.company.update({
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
        name: true,
        verificationStatus: true,
        verificationSubmittedAt: true,
      },
    });

    const platformAdmins = await tx.user.findMany({
      where: { platformRole: "PLATFORM_ADMIN" },
      select: {
        id: true,
        companies: {
          select: { companyId: true },
          take: 1,
        },
      },
    });

    const adminNotifications = platformAdmins.flatMap((admin) => {
      const adminCompanyId = admin.companies[0]?.companyId;
      if (!adminCompanyId) return [];

      return [{
        companyId: adminCompanyId,
        recipientUserId: admin.id,
        type: "COMPANY_VERIFICATION_SUBMITTED",
        title: "Company verification awaiting review",
        message: `${submittedCompany.name} submitted its company details for verification.`,
        href: "/platform/admin/verifications",
        metadata: { submittedCompanyId: membership.companyId },
      }];
    });

    if (adminNotifications.length > 0) {
      await tx.notification.createMany({ data: adminNotifications });
    }

    return submittedCompany;
  });

  return {
    success: true,
    verificationStatus: updated.verificationStatus,
    verificationSubmittedAt: updated.verificationSubmittedAt?.toISOString() ?? null,
  };
}

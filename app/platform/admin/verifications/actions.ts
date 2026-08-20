"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export async function reviewCompanyVerification(input: {
  companyId: string;
  decision: "APPROVE" | "REJECT";
  note?: string;
}) {
  const admin = await requirePlatformAdmin();
  const note = input.note?.trim() || null;

  const company = await prisma.company.findUnique({
    where: { id: input.companyId },
    select: {
      id: true,
      name: true,
      verificationStatus: true,
    },
  });

  if (!company) {
    return { success: false, error: "Company not found." } as const;
  }

  if (company.verificationStatus !== "SUBMITTED") {
    return { success: false, error: "Only submitted verification requests can be reviewed." } as const;
  }

  if (input.decision === "REJECT" && !note) {
    return { success: false, error: "Add a review note before rejecting a verification request." } as const;
  }

  const approved = input.decision === "APPROVE";
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: company.id },
      data: {
        verified: approved,
        verificationStatus: approved ? "VERIFIED" : "REJECTED",
        verificationReviewedAt: now,
        verificationReviewedByUserId: admin.id,
        verificationNotes: note,
      },
    });

    await tx.notification.create({
      data: {
        companyId: company.id,
        type: approved ? "COMPANY_VERIFICATION_APPROVED" : "COMPANY_VERIFICATION_REJECTED",
        title: approved ? "Company verification approved" : "Company verification needs attention",
        message: approved
          ? `${company.name} is now verified on Froto.`
          : `${company.name} verification was not approved. Open Company Profile to review the feedback and resubmit.`,
        href: "/platform/onboarding",
        metadata: note ? { reviewNote: note } : undefined,
      },
    });
  });

  revalidatePath("/platform/admin/verifications");
  revalidatePath("/platform/onboarding");
  revalidatePath("/platform");

  return { success: true } as const;
}

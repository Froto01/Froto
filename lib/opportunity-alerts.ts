import { prisma } from "@/lib/prisma";
import { sendOpportunityEmail } from "@/lib/resend-email";

type OpportunityType = "TRANSPORT_LANE" | "WAREHOUSE_SPACE" | "TENDER" | "GUEST_JOB";

type OpportunityAlertInput = {
  type: OpportunityType;
  title: string;
  locations: Array<string | null | undefined>;
  href: string;
  sourceCompanyId?: string | null;
  sourceUserId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

function normalise(value: string) {
  return value.trim().toLocaleLowerCase("en-AU");
}

function uniqueByUser<T extends { userId: string }>(items: T[]) {
  const unique = new Map<string, T>();
  for (const item of items) {
    if (!unique.has(item.userId)) unique.set(item.userId, item);
  }
  return [...unique.values()];
}

export async function notifyMatchingOpportunity(input: OpportunityAlertInput) {
  const cleanLocations = input.locations.filter(
    (value): value is string => Boolean(value?.trim())
  );
  const searchableLocations = cleanLocations.map(normalise);

  if (searchableLocations.length === 0) {
    return { matched: 0, inAppCreated: 0, emailCandidates: 0, emailsSent: 0 };
  }

  const preferences = await prisma.opportunityAlertPreference.findMany({
    where: {
      active: true,
      opportunityTypes: { has: input.type },
      ...(input.sourceUserId ? { userId: { not: input.sourceUserId } } : {}),
      ...(input.sourceCompanyId
        ? { OR: [{ companyId: null }, { companyId: { not: input.sourceCompanyId } }] }
        : {}),
    },
    include: {
      user: { select: { id: true, email: true, firstName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const matched = preferences.filter((preference) => {
    const keywords = preference.areaKeywords.map(normalise).filter(Boolean);
    return keywords.some((keyword) =>
      searchableLocations.some(
        (location) => location.includes(keyword) || keyword.includes(location)
      )
    );
  });

  const inAppMatches = uniqueByUser(
    matched.filter((preference) => preference.inAppEnabled)
  );
  let inAppCreated = 0;

  if (inAppMatches.length > 0) {
    const recipientIds = inAppMatches.map((preference) => preference.userId);
    const existing = await prisma.notification.findMany({
      where: {
        type: "OPPORTUNITY_MATCH",
        href: input.href,
        recipientUserId: { in: recipientIds },
      },
      select: { recipientUserId: true },
    });
    const alreadyNotified = new Set(
      existing
        .map((notification) => notification.recipientUserId)
        .filter((value): value is string => Boolean(value))
    );
    const newInAppMatches = inAppMatches.filter(
      (preference) => !alreadyNotified.has(preference.userId)
    );

    if (newInAppMatches.length > 0) {
      const result = await prisma.notification.createMany({
        data: newInAppMatches.map((preference) => ({
          companyId: preference.companyId,
          recipientUserId: preference.userId,
          type: "OPPORTUNITY_MATCH",
          title: `Opportunity match · ${input.title}`,
          message: `Froto found a new opportunity matching “${preference.name}” in ${cleanLocations.join(" / ")}.`,
          href: input.href,
          metadata: {
            opportunityType: input.type,
            alertPreferenceId: preference.id,
            ...(input.metadata ?? {}),
          },
        })),
      });
      inAppCreated = result.count;
    }
  }

  const emailMatches = uniqueByUser(
    matched.filter((preference) => preference.emailEnabled)
  );
  const emailResults = await Promise.all(
    emailMatches.map((preference) =>
      sendOpportunityEmail({
        to: preference.user.email,
        recipientName: preference.user.firstName,
        alertName: preference.name,
        opportunityTitle: input.title,
        opportunityType: input.type,
        locations: cleanLocations,
        href: input.href,
      })
    )
  );

  return {
    matched: matched.length,
    inAppCreated,
    emailCandidates: emailMatches.length,
    emailsSent: emailResults.filter((result) => result.status === "sent").length,
  };
}

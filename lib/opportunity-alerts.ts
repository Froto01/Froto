import { prisma } from "@/lib/prisma";

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

export async function notifyMatchingOpportunity(input: OpportunityAlertInput) {
  const searchableLocations = input.locations.filter((value): value is string => Boolean(value?.trim())).map(normalise);
  if (searchableLocations.length === 0) return { matched: 0, inAppCreated: 0, emailCandidates: 0 };

  const preferences = await prisma.opportunityAlertPreference.findMany({
    where: {
      active: true,
      opportunityTypes: { has: input.type },
      ...(input.sourceUserId ? { userId: { not: input.sourceUserId } } : {}),
      ...(input.sourceCompanyId ? { OR: [{ companyId: null }, { companyId: { not: input.sourceCompanyId } }] } : {}),
    },
    include: { user: { select: { id: true, email: true } } },
  });

  const matched = preferences.filter((preference) => {
    const keywords = preference.areaKeywords.map(normalise).filter(Boolean);
    return keywords.some((keyword) => searchableLocations.some((location) => location.includes(keyword) || keyword.includes(location)));
  });

  const inAppMatches = matched.filter((preference) => preference.inAppEnabled && preference.companyId);
  if (inAppMatches.length > 0) {
    await prisma.notification.createMany({
      data: inAppMatches.map((preference) => ({
        companyId: preference.companyId!,
        recipientUserId: preference.userId,
        type: "OPPORTUNITY_MATCH",
        title: `Opportunity match · ${input.title}`,
        message: `Froto found a new opportunity matching “${preference.name}” in ${input.locations.filter(Boolean).join(" / ")}.`,
        href: input.href,
        metadata: {
          opportunityType: input.type,
          alertPreferenceId: preference.id,
          ...(input.metadata ?? {}),
        },
      })),
    });
  }

  return {
    matched: matched.length,
    inAppCreated: inAppMatches.length,
    emailCandidates: matched.filter((preference) => preference.emailEnabled).length,
  };
}

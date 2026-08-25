export type PromotionSnapshot = {
  promotionType: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

export function getActivePromotion(
  promotions: PromotionSnapshot[],
  now = new Date()
): PromotionSnapshot | null {
  return (
    promotions.find((promotion) => {
      if (promotion.status !== "ACTIVE") return false;
      if (promotion.startsAt && promotion.startsAt > now) return false;
      if (promotion.endsAt && promotion.endsAt <= now) return false;
      return true;
    }) ?? null
  );
}

export function promotionRank(promotionType: string | null | undefined) {
  switch (promotionType) {
    case "URGENT":
      return 50;
    case "FEATURED_WAREHOUSE":
    case "HIGHLIGHTED_TENDER":
      return 40;
    case "FEATURED":
      return 30;
    case "PRIORITY":
      return 20;
    default:
      return 0;
  }
}

export function promotionLabel(promotionType: string | null | undefined) {
  switch (promotionType) {
    case "URGENT":
      return "Urgent · Promoted";
    case "FEATURED_WAREHOUSE":
      return "Featured warehouse · Promoted";
    case "HIGHLIGHTED_TENDER":
      return "Highlighted tender · Promoted";
    case "FEATURED":
      return "Featured · Promoted";
    case "PRIORITY":
      return "Priority · Promoted";
    default:
      return null;
  }
}

/**
 * Display-only opportunity availability. The server still authoritatively
 * enforces award, bid and response permissions.
 */
export type ListingAvailability = {
  auctionState: "OPEN" | "CLOSED";
  biddingClosesAt: string | null;
};

export type TenderAvailability = {
  status: "OPEN" | "CLOSED" | "AWARDED";
  responseClosed: boolean;
  responseClosesAt: string;
};

export function isOfferWindowOpen(closesAt: string | null, nowMs: number): boolean {
  if (closesAt === null) return true;
  const deadline = Date.parse(closesAt);
  return Number.isFinite(deadline) && deadline > nowMs;
}

export function listingBiddingState(listing: ListingAvailability, nowMs: number): "OPEN" | "CLOSED" {
  return listing.auctionState === "OPEN" && isOfferWindowOpen(listing.biddingClosesAt, nowMs)
    ? "OPEN"
    : "CLOSED";
}

export function tenderResponseState(tender: TenderAvailability, nowMs: number): "OPEN" | "CLOSED" | "AWARDED" {
  if (tender.status === "AWARDED") return "AWARDED";
  return tender.status === "OPEN" && !tender.responseClosed && isOfferWindowOpen(tender.responseClosesAt, nowMs)
    ? "OPEN"
    : "CLOSED";
}

/** Stable date-descending ordering within the two availability groups. */
export function sortOpenFirst<T extends { createdAt: string }>(
  opportunities: readonly T[],
  isOpen: (opportunity: T) => boolean,
): T[] {
  return [...opportunities].sort((left, right) =>
    Number(isOpen(right)) - Number(isOpen(left)) ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

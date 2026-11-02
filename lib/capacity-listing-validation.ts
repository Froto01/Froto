/** Client-side guidance only. The server action remains authoritative. */
export type CapacityListingDraft = {
  listingType: "Transport Lane" | "Warehouse Space";
  title: string;
  location: string;
  origin: string;
  destination: string;
  capacityAmount: string;
  availableFrom: string;
  availableTo: string;
  startingBid: string;
  minimumBidIncrement: string;
  biddingClosesAt: string;
};

function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function validateCapacityListing(input: CapacityListingDraft, nowMs: number): string | null {
  if (!input.title.trim()) return "Enter a listing title.";
  if (input.listingType === "Transport Lane" && (!input.origin.trim() || !input.destination.trim())) {
    return "Transport capacity requires an origin and destination.";
  }
  if (input.listingType === "Warehouse Space" && !input.location.trim()) {
    return "Warehouse capacity requires a location.";
  }

  const capacity = Number(input.capacityAmount);
  if (!input.capacityAmount.trim() || !Number.isSafeInteger(capacity) || capacity <= 0) {
    return "Capacity must be a positive whole number.";
  }

  const startingBid = Number(input.startingBid);
  if (!input.startingBid.trim() || !Number.isFinite(startingBid) || startingBid < 0) {
    return "Starting bid must be zero or greater.";
  }
  const increment = Number(input.minimumBidIncrement);
  if (!input.minimumBidIncrement.trim() || !Number.isFinite(increment) || increment <= 0) {
    return "Minimum bid increment must be greater than zero.";
  }

  if (!validDay(input.availableFrom) || !validDay(input.availableTo)) {
    return "Enter valid availability dates.";
  }
  if (input.availableTo < input.availableFrom) {
    return "Available-to cannot be earlier than available-from.";
  }
  const closeTime = Date.parse(input.biddingClosesAt);
  if (!input.biddingClosesAt.trim() || !Number.isFinite(closeTime) || closeTime <= nowMs) {
    return "Bidding close time must be in the future.";
  }
  return null;
}

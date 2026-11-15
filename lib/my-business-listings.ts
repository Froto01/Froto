/** Company-owned capacity listing pages. Never accept company scope from URL. */
export const LISTING_PAGE_SIZE = 25;
export function companyListingView(companyId: string, requested: unknown) {
  if (typeof companyId !== "string" || !companyId.trim()) throw new TypeError("Company ID required");
  const view = requested === "active" ? "active" : "all";
  return { view, where: view === "active" ? { companyId, status: "ACTIVE" } : { companyId } };
}
export function listingPage(requested: unknown, count: number) {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("Uncapped count required");
  const requestedNumber = typeof requested === "string" && /^[1-9]\d{0,5}$/.test(requested) ? Number(requested) : 1;
  const pageCount = Math.max(1, Math.ceil(count / LISTING_PAGE_SIZE));
  const page = Math.min(requestedNumber, pageCount);
  const skip = (page - 1) * LISTING_PAGE_SIZE;
  return { page, pageCount, skip, take: LISTING_PAGE_SIZE, start: count === 0 ? 0 : skip + 1, end: Math.min(page * LISTING_PAGE_SIZE, count) };
}

import { isLogisticsUnit, type LogisticsUnit } from "./logistics-units";

/**
 * Optional, user-initiated browser-only listing draft.
 * Only descriptive fields are retained. Availability and commercial terms
 * are deliberately NOT persisted and must be re-entered before review.
 * This is not a server-side, company-shared or cross-device draft.
 */
export type BrowserCapacityDraftDetails = {
  listingType: "Transport Lane" | "Warehouse Space";
  title: string;
  location: string;
  origin: string;
  destination: string;
  capacityAmount: string;
  capacityUnit: LogisticsUnit;
  temperatureClass: "ambient" | "chilled" | "frozen" | "dangerous goods" | "other";
  notes: string;
};

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIX = "froto:capacity-listing-browser-draft:v1:";
const VERSION = 1;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_STORED_LENGTH = 12_000;

function storageKey(userId: string): string {
  if (!userId.trim()) throw new Error("Sign in to save a browser draft.");
  return PREFIX + encodeURIComponent(userId);
}

function validDetails(value: unknown): value is BrowserCapacityDraftDetails {
  if (!value || typeof value !== "object") return false;
  const details = value as Record<string, unknown>;
  if (details.listingType !== "Transport Lane" && details.listingType !== "Warehouse Space") {
    return false;
  }
  if (!isLogisticsUnit(details.capacityUnit)) return false;
  if (!["ambient", "chilled", "frozen", "dangerous goods", "other"].includes(String(details.temperatureClass))) {
    return false;
  }
  for (const field of ["title", "location", "origin", "destination", "capacityAmount", "notes"]) {
    const fieldValue = details[field];
    if (typeof fieldValue !== "string" || fieldValue.length > (field === "notes" ? 4000 : 500)) {
      return false;
    }
  }
  return true;
}

function descriptiveFields(input: BrowserCapacityDraftDetails): BrowserCapacityDraftDetails {
  return {
    listingType: input.listingType,
    title: input.title,
    location: input.location,
    origin: input.origin,
    destination: input.destination,
    capacityAmount: input.capacityAmount,
    capacityUnit: input.capacityUnit,
    temperatureClass: input.temperatureClass,
    notes: input.notes,
  };
}

export function saveCapacityBrowserDraft(
  storage: DraftStorage,
  userId: string,
  input: BrowserCapacityDraftDetails,
  nowMs: number = Date.now(),
): string {
  const details = descriptiveFields(input);
  if (!validDetails(details) || !Number.isFinite(nowMs)) {
    throw new Error("Check the listing details before saving this browser draft.");
  }
  const savedAt = new Date(nowMs).toISOString();
  const encoded = JSON.stringify({ version: VERSION, savedAt, details });
  if (encoded.length > MAX_STORED_LENGTH) {
    throw new Error("The listing draft is too large for browser storage.");
  }
  storage.setItem(storageKey(userId), encoded);
  return savedAt;
}

export function readCapacityBrowserDraft(
  storage: DraftStorage,
  userId: string,
  nowMs: number = Date.now(),
): { details: BrowserCapacityDraftDetails; savedAt: string } | null {
  try {
    const key = storageKey(userId);
    const raw = storage.getItem(key);
    if (!raw) return null;
    if (raw.length > MAX_STORED_LENGTH) {
      storage.removeItem(key);
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    if (record.version !== VERSION || typeof record.savedAt !== "string") return null;
    const savedTime = Date.parse(record.savedAt);
    if (!Number.isFinite(savedTime) || savedTime > nowMs || nowMs - savedTime > MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    if (!validDetails(record.details)) return null;
    return { savedAt: record.savedAt, details: descriptiveFields(record.details) };
  } catch {
    // Corrupt, missing or blocked storage is never enough to publish a listing.
    return null;
  }
}

export function discardCapacityBrowserDraft(storage: DraftStorage, userId: string): void {
  storage.removeItem(storageKey(userId));
}

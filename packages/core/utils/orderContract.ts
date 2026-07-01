import type { ContractListing } from '../types/order';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isContractListing(value: unknown): value is ContractListing {
  if (!isRecord(value)) return false;
  return (
    typeof value.slug === 'string' &&
    isRecord(value.item) &&
    isRecord(value.metadata) &&
    isRecord(value.vendorID)
  );
}

/** Normalize canonical signed listings and legacy direct listings from order-open payloads. */
export function normalizeOrderOpenListings(value: unknown): ContractListing[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap(entry => {
    const candidate = isRecord(entry) && 'listing' in entry ? entry.listing : entry;
    return isContractListing(candidate) ? [candidate] : [];
  });
}

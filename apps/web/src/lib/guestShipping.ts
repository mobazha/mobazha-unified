import { getCountryContinent, normalizeGuestShippingCountry } from '@mobazha/core';
import type { GuestCartItem } from '@mobazha/core/stores';

export type GuestShippingOption = NonNullable<GuestCartItem['shippingOptions']>[number];

export { normalizeGuestShippingCountry as normalizeShippingCountry };

export function shippingOptionSupportsCountry(
  option: GuestShippingOption,
  countryCode: string
): boolean {
  if (!countryCode) return false;
  const continent = getCountryContinent(countryCode);
  return option.regions.some(region => {
    const normalized = region.trim().toUpperCase();
    return (
      normalized === countryCode ||
      normalized === 'ALL' ||
      normalized === 'WORLDWIDE' ||
      normalized === continent
    );
  });
}

export function shippingConditionMatches(
  item: GuestCartItem,
  option: GuestShippingOption,
  subtotal: number
): boolean {
  if (!option.condition) return true;
  const value =
    option.condition.type === 'weight'
      ? Math.max(0, item.unitWeightGrams || 0) * item.quantity
      : subtotal;
  return (
    value >= option.condition.minValue &&
    (option.condition.maxValue === 0 || value <= option.condition.maxValue)
  );
}

export function effectiveShippingPrice(option: GuestShippingOption, subtotal: number): string {
  const threshold = option.freeShippingThreshold;
  if (threshold?.enabled && /^\d+$/.test(threshold.minAmount)) {
    const normalizedSubtotal = BigInt(Math.max(0, Math.trunc(subtotal)));
    if (normalizedSubtotal >= BigInt(threshold.minAmount)) return '0';
  }
  return option.price;
}

export function availableShippingOptions(
  item: GuestCartItem,
  countryCode: string,
  subtotal: number
): GuestShippingOption[] {
  return (item.shippingOptions ?? []).filter(
    option =>
      shippingOptionSupportsCountry(option, countryCode) &&
      shippingConditionMatches(item, option, subtotal)
  );
}

export function shippingSelectionMatchesOption(
  item: GuestCartItem,
  option: GuestShippingOption
): boolean {
  return (
    (option.zoneID === item.shipping?.name || option.zoneName === item.shipping?.name) &&
    (option.rateID === item.shipping?.service || option.rateName === item.shipping?.service)
  );
}

export function physicalShippingIsReady(
  items: GuestCartItem[],
  countryCode: string,
  subtotal: number
): boolean {
  return items
    .filter(item => item.contractType === 'PHYSICAL_GOOD')
    .every(item =>
      availableShippingOptions(item, countryCode, subtotal).some(option =>
        shippingSelectionMatchesOption(item, option)
      )
    );
}

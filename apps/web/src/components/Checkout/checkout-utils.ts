import type { Address as FrontendAddress } from '@/components/Address';
import type { DisplayAddress, ShippingProfile } from '@mobazha/core';
import { getAllZones } from '@mobazha/core';
import type { CheckoutShippingZone } from './types';

/** Convert ShippingProfile (new model) to checkout shipping zones */
export function profileToCheckoutZones(profile: ShippingProfile): CheckoutShippingZone[] {
  return getAllZones(profile).map(zone => ({
    id: zone.id,
    name: zone.name,
    regions: zone.regions || [],
    currency: zone.rates?.[0]?.currency ?? '',
    rates: (zone.rates || []).map(rate => ({
      id: rate.id,
      name: rate.name,
      price: parseInt(rate.price, 10) || 0,
      currency: rate.currency ?? '',
      estimatedDelivery: rate.estimatedDelivery,
    })),
  }));
}

/** Convert DisplayAddress (API format) to frontend Address format */
export function toFrontendAddress(addr: DisplayAddress): FrontendAddress {
  return {
    id: addr.id,
    name: addr.name,
    street: addr.addressLineOne + (addr.addressLineTwo ? `, ${addr.addressLineTwo}` : ''),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    phone: addr.phone || '',
    isDefault: addr.isDefault,
  };
}

/** Convert DisplayAddress to the format expected by the order API */
export function toOrderAddress(addr: DisplayAddress) {
  return {
    name: addr.name,
    street: addr.addressLineOne + (addr.addressLineTwo ? `, ${addr.addressLineTwo}` : ''),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    addressNotes: addr.addressNotes,
  };
}

/** Check whether a shipping zone applies to a given country */
export function isZoneAvailable(
  zone: CheckoutShippingZone,
  countryCode: string | undefined
): boolean {
  if (!countryCode) return true;
  if (!zone.regions || zone.regions.length === 0) return true;
  const upperCountry = countryCode.toUpperCase();
  return zone.regions.some(
    region => region.toUpperCase() === 'ALL' || region.toUpperCase() === upperCountry
  );
}

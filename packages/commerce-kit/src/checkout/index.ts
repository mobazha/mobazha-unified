export const CHECKOUT_FEATURE_ID = 'commerce.checkout';
export { createGuestCheckoutAdapter, normalizeGuestCheckoutSettings } from './contracts';
export type {
  CommerceGuestCheckoutAdapter,
  CommerceGuestCheckoutSettings,
  CommerceGuestCheckoutSettingsWire,
  CommerceGuestOrderItemRequest,
  CommerceGuestOrderItemResponse,
  CommerceGuestOrderRequest,
  CommerceGuestOrderResponse,
} from './contracts';
export { COMMERCE_SLOTS } from '../slots';
export type {
  CommerceFeaturePackage,
  CommerceRouteDescriptor,
  CommerceSlotContribution,
} from '../contracts';

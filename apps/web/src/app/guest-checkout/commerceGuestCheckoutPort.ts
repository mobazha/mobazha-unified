import {
  createGuestOrder,
  getGuestCheckoutSettings,
} from '@mobazha/core/services/api/guestCheckout';
import type { CommerceGuestCheckoutPort } from '@mobazha/commerce-kit/checkout';

/** Unified adapter: preserve the existing gateway/context routing behind the public port. */
export const commerceGuestCheckoutPort: CommerceGuestCheckoutPort = {
  getSettings: options => getGuestCheckoutSettings(options),
  createOrder: (request, options) => createGuestOrder(request, options),
};

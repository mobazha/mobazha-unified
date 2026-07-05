import {
  createGuestOrder,
  getGuestCheckoutSettings,
  getGuestOrderStatusWire,
} from '@mobazha/core/services/api/guestCheckout';
import type {
  CommerceGuestCheckoutPort,
  CommerceGuestOrderStatusPort,
} from '@mobazha/commerce-kit/checkout';
import { normalizeCommerceGuestOrderStatus } from '@mobazha/commerce-kit/checkout';

/** Unified adapter: preserve the existing gateway/context routing behind the public port. */
export const commerceGuestCheckoutPort: CommerceGuestCheckoutPort = {
  getSettings: options => getGuestCheckoutSettings(options),
  createOrder: (request, options) => createGuestOrder(request, options),
};

/** Unified adapter: public status requests use the anonymous Core transport. */
export const commerceGuestOrderStatusPort: CommerceGuestOrderStatusPort = {
  getOrder: (orderToken, options) =>
    getGuestOrderStatusWire(orderToken, options).then(normalizeCommerceGuestOrderStatus),
};

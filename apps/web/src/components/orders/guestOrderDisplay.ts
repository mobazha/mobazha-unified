import type { GuestOrderKind } from '@mobazha/core';
import type { TranslateFunction } from '@mobazha/core/i18n/types';
import type { GuestOrderAdminDetail } from '@mobazha/core/services/api/guestCheckout';
import { formatGuestStateLabel, guestStateBadgeClass } from '@/components/Order/orderStatusConfig';

export {
  inferGuestOrderKindFromItems,
  isMissingContractTypeReason,
  resolveGuestOrderKind,
  type GuestOrderKind,
  type GuestOrderKindHint,
} from '@mobazha/core';

export { formatGuestStateLabel, guestStateBadgeClass };

/**
 * Guest fulfillment uses a shared SHIPPED wire state for every contract type.
 * Keep that backend state out of service/digital customer-facing copy.
 */
export function formatGuestOrderStateLabel(
  state: string,
  orderKind: GuestOrderKind,
  t: TranslateFunction
): string {
  if (state === 'SHIPPED' || state === 'FULFILLED') {
    if (orderKind === 'service') return t('order.serviceDelivered');
    if (orderKind === 'digital') return t('order.digitalDelivered');
  }
  return formatGuestStateLabel(state, t);
}

/** Contract-aware buyer copy for the shared SHIPPED/FULFILLED wire state. */
export function formatGuestOrderStateDescription(
  state: string,
  orderKind: GuestOrderKind,
  fallback: string | undefined,
  t: TranslateFunction
): string | undefined {
  if (state === 'SHIPPED' || state === 'FULFILLED') {
    if (orderKind === 'service') return t('guestOrder.stateServiceDeliveredDesc');
    if (orderKind === 'digital') return t('guestOrder.stateDigitalDeliveredDesc');
  }
  return fallback;
}

export function truncateOrderToken(token: string, head = 14, tail = 10): string {
  if (token.length <= head + tail + 3) return token;
  return `${token.slice(0, head)}…${token.slice(-tail)}`;
}

export function guestActionHelpText(state: string, t: TranslateFunction): string {
  switch (state) {
    case 'AWAITING_PAYMENT':
    case 'PAYMENT_DETECTED':
      return t('admin.orders.guestActionWaitingPayment');
    case 'COMPLETED':
      return t('admin.orders.guestActionCompleted');
    case 'EXPIRED':
      return t('admin.orders.guestActionExpired');
    default:
      return t('admin.orders.guestActionNoAction');
  }
}

export function isGuestOrderPhysical(
  detail: Pick<
    GuestOrderAdminDetail,
    'addressEncrypted' | 'shippingAddressCiphertext' | 'shippingAddress'
  >
): boolean {
  if (detail.addressEncrypted && detail.shippingAddressCiphertext?.trim()) {
    return true;
  }
  if (detail.shippingAddress) {
    return Object.values(detail.shippingAddress).some(value => value?.trim());
  }
  return false;
}

export function guestOrderKindLabel(orderKind: GuestOrderKind, t: TranslateFunction): string {
  switch (orderKind) {
    case 'digital':
      return t('admin.orders.guestOrderTypeDigital');
    case 'physical':
      return t('admin.orders.guestOrderTypePhysical');
    case 'service':
      return t('admin.orders.guestOrderTypeService');
    default:
      return t('admin.orders.guestOrderTypeUnknown');
  }
}

/** Guard async guest detail loads — only the latest requested token may update UI state. */
export function isActiveGuestDetailRequest(
  requestedToken: string,
  activeRequestToken: string | null
): boolean {
  return activeRequestToken === requestedToken;
}

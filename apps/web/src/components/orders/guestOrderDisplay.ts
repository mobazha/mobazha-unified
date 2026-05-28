import type { TranslateFunction } from '@mobazha/core/i18n/types';
import type {
  GuestOrderAdminDetail,
  GuestOrderItemResponse,
} from '@mobazha/core/services/api/guestCheckout';
import { formatGuestStateLabel, guestStateBadgeClass } from '@/components/Order/orderStatusConfig';

export { formatGuestStateLabel, guestStateBadgeClass };

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

export type GuestOrderKindHint = 'digital' | 'physical' | null;

/** Resolved guest order kind — never infer physical from missing metadata. */
export type GuestOrderKind = 'digital' | 'physical' | 'unknown';

/** Infer order kind from persisted line-item contract types (authoritative when present). */
export function inferGuestOrderKindFromItems(
  items: Pick<GuestOrderItemResponse, 'contractType'>[]
): GuestOrderKindHint {
  if (!items.length) return null;
  const types = items.map(item => item.contractType?.trim()).filter(Boolean);
  if (types.length !== items.length) return null;
  if (types.every(type => type === 'DIGITAL_GOOD')) return 'digital';
  if (types.some(type => type === 'PHYSICAL_GOOD')) return 'physical';
  if (types.some(type => type === 'DIGITAL_GOOD')) return 'digital';
  return null;
}

export function isMissingContractTypeReason(reason?: string | null): boolean {
  return reason?.trim() === 'missing_contract_type';
}

/** Combine delivery API + line items without defaulting non-digital to physical. */
export function resolveGuestOrderKind(input: {
  deliveryKnown: boolean;
  isDigitalFromApi?: boolean | null;
  deliveryReason?: string | null;
  kindFromItems: GuestOrderKindHint;
}): GuestOrderKind {
  if (input.deliveryKnown && isMissingContractTypeReason(input.deliveryReason)) {
    return 'unknown';
  }

  if (input.kindFromItems === 'digital') return 'digital';
  if (input.kindFromItems === 'physical') return 'physical';

  if (input.deliveryKnown) {
    if (input.isDigitalFromApi === true) return 'digital';
    // Delivery API "not digital" covers physical and other contract types — do not guess physical.
    return 'unknown';
  }

  return 'unknown';
}

export function guestOrderKindLabel(orderKind: GuestOrderKind, t: TranslateFunction): string {
  switch (orderKind) {
    case 'digital':
      return t('admin.orders.guestOrderTypeDigital');
    case 'physical':
      return t('admin.orders.guestOrderTypePhysical');
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

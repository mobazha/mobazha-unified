import type { TranslateFunction } from '@mobazha/core/i18n/types';
import type {
  GuestOrderAdminDetail,
  GuestOrderStatus,
} from '@mobazha/core/services/api/guestCheckout';
import type { GuestOrderKind } from './guestOrderDisplay';

/** Buyer/seller progress strip: payment → paid → delivered → complete */
export const GUEST_ORDER_PROGRESS_STAGES = ['payment', 'paid', 'delivered', 'complete'] as const;

export type GuestOrderProgressStage = (typeof GUEST_ORDER_PROGRESS_STAGES)[number];

export function resolveGuestProgressStageIndex(state: string): number {
  switch (state) {
    case 'AWAITING_PAYMENT':
    case 'PAYMENT_DETECTED':
      return 0;
    case 'FUNDED':
      return 1;
    case 'SHIPPED':
      return 2;
    case 'COMPLETED':
      return 3;
    default:
      return -1;
  }
}

export function guestProgressStageLabel(
  stage: GuestOrderProgressStage,
  orderKind: GuestOrderKind,
  t: TranslateFunction
): string {
  if (stage === 'delivered') {
    if (orderKind === 'physical') return t('guestOrder.stages.shipped');
    if (orderKind === 'digital' || orderKind === 'service') {
      return t('guestOrder.stages.delivered');
    }
    return t('guestOrder.stages.deliveredGeneric');
  }
  const keyMap: Record<Exclude<GuestOrderProgressStage, 'delivered'>, string> = {
    payment: 'guestOrder.stages.payment',
    paid: 'guestOrder.stages.paid',
    complete: 'guestOrder.stages.complete',
  };
  return t(keyMap[stage]);
}

export function formatGuestMilestoneTime(value?: string): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Formatted milestone time, or pending label when state implies the milestone but timestamp is missing. */
export function formatGuestMilestoneDisplay(at: string | undefined, pendingLabel: string): string {
  return formatGuestMilestoneTime(at) ?? pendingLabel;
}

export interface GuestOrderMilestone {
  id: 'funded' | 'shipped' | 'completed';
  labelKey:
    | 'admin.orders.guestMilestoneFunded'
    | 'admin.orders.guestMilestoneShipped'
    | 'admin.orders.guestMilestoneCompleted'
    | 'guestOrder.milestones.funded'
    | 'guestOrder.milestones.shipped'
    | 'guestOrder.milestones.delivered'
    | 'guestOrder.milestones.completed';
  at?: string;
}

type GuestMilestoneInput = {
  fundedAt?: string;
  shippedAt?: string;
  completedAt?: string;
  state: string;
};

function buildGuestOrderMilestones(
  detail: GuestMilestoneInput,
  keys: {
    funded: GuestOrderMilestone['labelKey'];
    shipped: GuestOrderMilestone['labelKey'];
    completed: GuestOrderMilestone['labelKey'];
  }
): GuestOrderMilestone[] {
  const milestones: GuestOrderMilestone[] = [];
  if (detail.fundedAt || ['FUNDED', 'SHIPPED', 'COMPLETED'].includes(detail.state)) {
    milestones.push({ id: 'funded', labelKey: keys.funded, at: detail.fundedAt });
  }
  if (detail.shippedAt || ['SHIPPED', 'COMPLETED'].includes(detail.state)) {
    milestones.push({ id: 'shipped', labelKey: keys.shipped, at: detail.shippedAt });
  }
  if (detail.completedAt || detail.state === 'COMPLETED') {
    milestones.push({ id: 'completed', labelKey: keys.completed, at: detail.completedAt });
  }
  return milestones;
}

export function guestOrderMilestones(
  detail: Pick<GuestOrderAdminDetail, 'fundedAt' | 'shippedAt' | 'completedAt' | 'state'>
): GuestOrderMilestone[] {
  return buildGuestOrderMilestones(detail, {
    funded: 'admin.orders.guestMilestoneFunded',
    shipped: 'admin.orders.guestMilestoneShipped',
    completed: 'admin.orders.guestMilestoneCompleted',
  });
}

export function guestOrderMilestonesFromStatus(
  order: Pick<GuestOrderStatus, 'fundedAt' | 'shippedAt' | 'completedAt' | 'state'>,
  orderKind: GuestOrderKind = 'unknown'
): GuestOrderMilestone[] {
  return buildGuestOrderMilestones(order, {
    funded: 'guestOrder.milestones.funded',
    shipped:
      orderKind === 'service' || orderKind === 'digital'
        ? 'guestOrder.milestones.delivered'
        : 'guestOrder.milestones.shipped',
    completed: 'guestOrder.milestones.completed',
  });
}

export function hasGuestTrackingInfo(
  detail: Pick<GuestOrderAdminDetail, 'trackingNumber' | 'shippingCarrier'>
): boolean {
  return Boolean(detail.trackingNumber?.trim() || detail.shippingCarrier?.trim());
}

/** Buyer-facing physical hint from public guest order status. */
export function isGuestBuyerOrderPhysical(order: {
  trackingNumber?: string;
  carrier?: string;
  shippingCarrier?: string;
  shippingCost?: number;
}): boolean {
  if (order.trackingNumber?.trim() || order.carrier?.trim() || order.shippingCarrier?.trim()) {
    return true;
  }
  return (order.shippingCost ?? 0) > 0;
}

export function hasGuestPublicTrackingInfo(
  order: Pick<GuestOrderStatus, 'trackingNumber' | 'carrier' | 'shippingCarrier'>
): boolean {
  return Boolean(
    order.trackingNumber?.trim() || order.carrier?.trim() || order.shippingCarrier?.trim()
  );
}

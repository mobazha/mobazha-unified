import {
  Clock,
  CircleDollarSign,
  RefreshCw,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
  Undo2,
  Gavel,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from 'lucide-react';

type TranslateFn = (key: string) => string;

export interface StatusDisplayConfig {
  label: string;
  color: string;
  icon?: LucideIcon;
  description?: string;
}

/**
 * Standard Escrow order states (lowercase keys from backend).
 * Colors use design tokens for consistency with the design system.
 */
export function getStandardStatusConfig(t: TranslateFn): Record<string, StatusDisplayConfig> {
  return {
    awaiting_payment: {
      label: t('order.statusLabels.awaitingPayment'),
      color: 'bg-warning/15 text-warning',
      icon: CircleDollarSign,
    },
    pending: {
      label: t('order.statusLabels.pending'),
      color: 'bg-warning/15 text-warning',
      icon: Clock,
    },
    processing: {
      label: t('order.statusLabels.processing'),
      color: 'bg-info/15 text-info',
      icon: RefreshCw,
    },
    shipped: {
      label: t('order.statusLabels.shipped'),
      color: 'bg-primary/15 text-primary',
      icon: Package,
    },
    delivered: {
      label: t('order.statusLabels.delivered'),
      color: 'bg-success/15 text-success',
      icon: CheckCircle2,
    },
    disputed: {
      label: t('order.statusLabels.disputed'),
      color: 'bg-error/15 text-error',
      icon: AlertTriangle,
    },
    completed: {
      label: t('order.statusLabels.completed'),
      color: 'bg-success/15 text-success',
      icon: CheckCircle2,
    },
    cancelled: {
      label: t('order.statusLabels.cancelled'),
      color: 'bg-muted text-muted-foreground',
      icon: XCircle,
    },
    declined: {
      label: t('order.statusLabels.declined'),
      color: 'bg-error/15 text-error',
      icon: Ban,
    },
    refunded: {
      label: t('order.statusLabels.refunded'),
      color: 'bg-muted text-muted-foreground',
      icon: Undo2,
    },
    decided: {
      label: t('order.statusLabels.decided'),
      color: 'bg-info/15 text-info',
      icon: Gavel,
    },
    finalized: {
      label: t('order.statusLabels.finalized'),
      color: 'bg-success/15 text-success',
      icon: ShieldCheck,
    },
    error: {
      label: t('order.statusLabels.error'),
      color: 'bg-error/15 text-error',
      icon: AlertTriangle,
    },
  };
}

/**
 * Guest DirectPayment order states (UPPER_CASE keys from backend).
 * Uses the same design token color palette as standard orders.
 */
export function getGuestStatusConfig(t: TranslateFn): Record<string, StatusDisplayConfig> {
  return {
    AWAITING_PAYMENT: {
      label: t('guestOrder.stateAwaitingPayment'),
      color: 'bg-warning/15 text-warning',
      icon: CircleDollarSign,
      description: t('guestOrder.stateAwaitingPaymentDesc'),
    },
    PAYMENT_DETECTED: {
      label: t('guestOrder.statePendingConfirmation'),
      color: 'bg-info/15 text-info',
      icon: Timer,
      description: t('guestOrder.statePendingConfirmationDesc'),
    },
    PENDING_CONFIRMATION: {
      label: t('guestOrder.statePendingConfirmation'),
      color: 'bg-info/15 text-info',
      icon: Timer,
      description: t('guestOrder.statePendingConfirmationDesc'),
    },
    FUNDED: {
      label: t('guestOrder.stateFunded'),
      color: 'bg-success/15 text-success',
      icon: CheckCircle2,
      description: t('guestOrder.stateFundedDesc'),
    },
    PROCESSING: {
      label: t('guestOrder.stateProcessing'),
      color: 'bg-info/15 text-info',
      icon: RefreshCw,
      description: t('guestOrder.stateProcessingDesc'),
    },
    SHIPPED: {
      label: t('guestOrder.stateShipped'),
      color: 'bg-primary/15 text-primary',
      icon: Package,
      description: t('guestOrder.stateShippedDesc'),
    },
    /** Legacy API string — same display as SHIPPED */
    FULFILLED: {
      label: t('guestOrder.stateShipped'),
      color: 'bg-primary/15 text-primary',
      icon: Package,
      description: t('guestOrder.stateShippedDesc'),
    },
    COMPLETED: {
      label: t('guestOrder.stateCompleted'),
      color: 'bg-success/15 text-success',
      icon: CheckCircle2,
      description: t('guestOrder.stateCompletedDesc'),
    },
    EXPIRED: {
      label: t('guestOrder.stateExpired'),
      color: 'bg-error/15 text-error',
      icon: Clock,
      description: t('guestOrder.stateExpiredDesc'),
    },
    CANCELLED: {
      label: t('guestOrder.stateCancelled'),
      color: 'bg-muted text-muted-foreground',
      icon: XCircle,
      description: t('guestOrder.stateCancelledDesc'),
    },
  };
}

const UNKNOWN_COLOR = 'bg-muted text-muted-foreground';

export function resolveStatusDisplay(
  state: string,
  config: Record<string, StatusDisplayConfig>
): StatusDisplayConfig {
  return (
    config[state] ?? {
      label: state.replace(/_/g, ' ').replace(/\b\w/g, s => s.toUpperCase()),
      color: UNKNOWN_COLOR,
    }
  );
}

function guestStatusOutlineClass(color: string): string {
  if (color.includes('text-warning')) return `${color} border border-warning/30`;
  if (color.includes('text-success')) return `${color} border border-success/30`;
  if (color.includes('text-primary')) return `${color} border border-primary/30`;
  if (color.includes('text-error')) return `${color} border border-error/30`;
  if (color.includes('text-info')) return `${color} border border-info/30`;
  return `${color} border border-border`;
}

/** Shared guest-order state label — reuses buyer-facing `guestOrder.state*` i18n keys. */
export function formatGuestStateLabel(state: string, t: TranslateFn): string {
  return resolveStatusDisplay(state, getGuestStatusConfig(t)).label;
}

/** Badge classes aligned with `getGuestStatusConfig` color tokens. */
export function guestStateBadgeClass(state: string, t: TranslateFn): string {
  const { color } = resolveStatusDisplay(state, getGuestStatusConfig(t));
  return guestStatusOutlineClass(color);
}

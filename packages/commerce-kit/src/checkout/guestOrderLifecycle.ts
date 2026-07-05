import type { CommerceGuestOrderStatus } from './guestOrderStatus';

export interface CommerceGuestOrderIdleState {
  status: 'idle';
}

export interface CommerceGuestOrderLoadingState {
  status: 'loading';
  orderToken: string;
}

export interface CommerceGuestOrderReadyState {
  status: 'ready';
  orderToken: string;
  order: CommerceGuestOrderStatus;
}

export interface CommerceGuestOrderRefreshingState {
  status: 'refreshing';
  orderToken: string;
  order: CommerceGuestOrderStatus;
}

export interface CommerceGuestOrderErrorState {
  status: 'error';
  orderToken: string;
  error: unknown;
  order?: CommerceGuestOrderStatus;
}

export type CommerceGuestOrderLifecycleState =
  | CommerceGuestOrderIdleState
  | CommerceGuestOrderLoadingState
  | CommerceGuestOrderReadyState
  | CommerceGuestOrderRefreshingState
  | CommerceGuestOrderErrorState;

export type CommerceGuestOrderLifecycleEvent =
  | { type: 'reset' }
  | { type: 'load-started'; orderToken: string }
  | { type: 'order-loaded'; orderToken: string; order: CommerceGuestOrderStatus }
  | { type: 'load-failed'; orderToken: string; error: unknown };

export const INITIAL_COMMERCE_GUEST_ORDER_STATE: CommerceGuestOrderLifecycleState = {
  status: 'idle',
};

export function commerceGuestOrderFromLifecycle(
  state: CommerceGuestOrderLifecycleState,
  expectedOrderToken?: string
): CommerceGuestOrderStatus | undefined {
  if (!('order' in state) || !state.order) return undefined;
  if (expectedOrderToken && state.orderToken !== expectedOrderToken) return undefined;
  return state.order;
}

/** Terminal public states cannot produce a later buyer-visible transition. */
export function shouldPollCommerceGuestOrder(state: string): boolean {
  return !['COMPLETED', 'EXPIRED', 'CANCELLED'].includes(state.toUpperCase());
}

/** Pure lifecycle reducer; product shells remain responsible for their own rendering. */
export function commerceGuestOrderLifecycleReducer(
  state: CommerceGuestOrderLifecycleState,
  event: CommerceGuestOrderLifecycleEvent
): CommerceGuestOrderLifecycleState {
  switch (event.type) {
    case 'reset':
      return INITIAL_COMMERCE_GUEST_ORDER_STATE;
    case 'load-started': {
      const order = commerceGuestOrderFromLifecycle(state, event.orderToken);
      return order
        ? { status: 'refreshing', orderToken: event.orderToken, order }
        : { status: 'loading', orderToken: event.orderToken };
    }
    case 'order-loaded':
      return { status: 'ready', orderToken: event.orderToken, order: event.order };
    case 'load-failed':
      return {
        status: 'error',
        orderToken: event.orderToken,
        error: event.error,
        order: commerceGuestOrderFromLifecycle(state, event.orderToken),
      };
    default:
      return state;
  }
}

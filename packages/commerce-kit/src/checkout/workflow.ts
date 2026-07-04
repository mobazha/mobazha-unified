import type { CommerceGuestCheckoutSettings, CommerceGuestOrderResponse } from './contracts';

export type CommerceGuestCheckoutUnavailableReason = 'disabled' | 'no-payment-methods';
export type CommerceGuestCheckoutOperation = 'load-settings' | 'create-order';

interface CommerceGuestCheckoutStateBase {
  settings?: CommerceGuestCheckoutSettings;
}

export interface CommerceGuestCheckoutIdleState extends CommerceGuestCheckoutStateBase {
  status: 'idle';
}

export interface CommerceGuestCheckoutLoadingState extends CommerceGuestCheckoutStateBase {
  status: 'loading-settings';
}

export interface CommerceGuestCheckoutReadyState extends CommerceGuestCheckoutStateBase {
  status: 'ready';
  settings: CommerceGuestCheckoutSettings;
}

export interface CommerceGuestCheckoutUnavailableState extends CommerceGuestCheckoutStateBase {
  status: 'unavailable';
  settings: CommerceGuestCheckoutSettings;
  reason: CommerceGuestCheckoutUnavailableReason;
}

export interface CommerceGuestCheckoutSubmittingState extends CommerceGuestCheckoutStateBase {
  status: 'submitting';
  settings: CommerceGuestCheckoutSettings;
}

export interface CommerceGuestCheckoutAwaitingPaymentState extends CommerceGuestCheckoutStateBase {
  status: 'awaiting-payment';
  settings: CommerceGuestCheckoutSettings;
  order: CommerceGuestOrderResponse;
}

export interface CommerceGuestCheckoutErrorState extends CommerceGuestCheckoutStateBase {
  status: 'error';
  operation: CommerceGuestCheckoutOperation;
  error: unknown;
}

export type CommerceGuestCheckoutWorkflowState =
  | CommerceGuestCheckoutIdleState
  | CommerceGuestCheckoutLoadingState
  | CommerceGuestCheckoutReadyState
  | CommerceGuestCheckoutUnavailableState
  | CommerceGuestCheckoutSubmittingState
  | CommerceGuestCheckoutAwaitingPaymentState
  | CommerceGuestCheckoutErrorState;

export type CommerceGuestCheckoutWorkflowEvent =
  | { type: 'load-started' }
  | { type: 'settings-loaded'; settings: CommerceGuestCheckoutSettings }
  | { type: 'submit-started'; settings: CommerceGuestCheckoutSettings }
  | {
      type: 'order-created';
      settings: CommerceGuestCheckoutSettings;
      order: CommerceGuestOrderResponse;
    }
  | {
      type: 'operation-failed';
      operation: CommerceGuestCheckoutOperation;
      error: unknown;
      settings?: CommerceGuestCheckoutSettings;
    }
  | { type: 'error-reset' };

export const INITIAL_COMMERCE_GUEST_CHECKOUT_STATE: CommerceGuestCheckoutWorkflowState = {
  status: 'idle',
};

function readyState(
  settings: CommerceGuestCheckoutSettings
): CommerceGuestCheckoutReadyState | CommerceGuestCheckoutUnavailableState {
  if (!settings.enabled) {
    return { status: 'unavailable', reason: 'disabled', settings };
  }
  if (settings.availableCoins.length === 0) {
    return { status: 'unavailable', reason: 'no-payment-methods', settings };
  }
  return { status: 'ready', settings };
}

/** Pure public workflow reducer shared by React and non-React consumers. */
export function commerceGuestCheckoutReducer(
  state: CommerceGuestCheckoutWorkflowState,
  event: CommerceGuestCheckoutWorkflowEvent
): CommerceGuestCheckoutWorkflowState {
  switch (event.type) {
    case 'load-started':
      return { status: 'loading-settings' };
    case 'settings-loaded':
      return readyState(event.settings);
    case 'submit-started':
      return { status: 'submitting', settings: event.settings };
    case 'order-created':
      return {
        status: 'awaiting-payment',
        settings: event.settings,
        order: event.order,
      };
    case 'operation-failed':
      return {
        status: 'error',
        operation: event.operation,
        error: event.error,
        settings: event.settings,
      };
    case 'error-reset':
      return state.status === 'error' && state.settings
        ? readyState(state.settings)
        : INITIAL_COMMERCE_GUEST_CHECKOUT_STATE;
    default:
      return state;
  }
}

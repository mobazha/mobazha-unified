import { useCallback, useEffect, useReducer, useRef } from 'react';
import type {
  CommerceGuestCheckoutPort,
  CommerceGuestCheckoutSettings,
  CommerceGuestOrderRequest,
  CommerceGuestOrderResponse,
} from './contracts';
import {
  INITIAL_COMMERCE_GUEST_CHECKOUT_STATE,
  commerceGuestCheckoutReducer,
  type CommerceGuestCheckoutWorkflowState,
} from './workflow';

export type CommerceGuestCheckoutSubmitResult =
  | { ok: true; order: CommerceGuestOrderResponse }
  | { ok: false; error: unknown; aborted: boolean };

export interface UseGuestCheckoutWorkflowResult {
  state: CommerceGuestCheckoutWorkflowState;
  reloadSettings(): Promise<void>;
  submit(request: CommerceGuestOrderRequest): Promise<CommerceGuestCheckoutSubmitResult>;
  resetError(): void;
}

function usableSettings(
  state: CommerceGuestCheckoutWorkflowState
): CommerceGuestCheckoutSettings | undefined {
  const settings = state.settings;
  return settings?.enabled && settings.availableCoins.length > 0 ? settings : undefined;
}

/** React binding for the public settings/create-order workflow. */
export function useGuestCheckoutWorkflow(
  port: CommerceGuestCheckoutPort
): UseGuestCheckoutWorkflowResult {
  const [state, dispatch] = useReducer(
    commerceGuestCheckoutReducer,
    INITIAL_COMMERCE_GUEST_CHECKOUT_STATE
  );
  const loadSequence = useRef(0);
  const submitSequence = useRef(0);
  const activeLoad = useRef<AbortController | undefined>(undefined);
  const activeSubmit = useRef<AbortController | undefined>(undefined);

  const reloadSettings = useCallback(async (): Promise<void> => {
    activeLoad.current?.abort();
    const controller = new AbortController();
    activeLoad.current = controller;
    const sequence = ++loadSequence.current;
    dispatch({ type: 'load-started' });
    try {
      const settings = await port.getSettings({ signal: controller.signal });
      if (controller.signal.aborted || sequence !== loadSequence.current) return;
      dispatch({ type: 'settings-loaded', settings });
    } catch (error) {
      if (controller.signal.aborted || sequence !== loadSequence.current) return;
      dispatch({ type: 'operation-failed', operation: 'load-settings', error });
    } finally {
      if (activeLoad.current === controller) activeLoad.current = undefined;
    }
  }, [port]);

  useEffect(() => {
    void reloadSettings();
    return () => {
      loadSequence.current += 1;
      submitSequence.current += 1;
      activeLoad.current?.abort();
      activeSubmit.current?.abort();
    };
  }, [reloadSettings]);

  const submit = useCallback(
    async (request: CommerceGuestOrderRequest): Promise<CommerceGuestCheckoutSubmitResult> => {
      const settings = usableSettings(state);
      if (!settings) {
        const error = new Error('guest checkout is not ready');
        return { ok: false, error, aborted: false };
      }

      const sequence = ++submitSequence.current;
      activeSubmit.current?.abort();
      const controller = new AbortController();
      activeSubmit.current = controller;
      dispatch({ type: 'submit-started', settings });
      try {
        const order = await port.createOrder(request, { signal: controller.signal });
        if (controller.signal.aborted || sequence !== submitSequence.current) {
          return { ok: false, error: controller.signal.reason, aborted: true };
        }
        dispatch({ type: 'order-created', settings, order });
        return { ok: true, order };
      } catch (error) {
        const aborted = controller.signal.aborted || sequence !== submitSequence.current;
        if (!aborted) {
          dispatch({
            type: 'operation-failed',
            operation: 'create-order',
            error,
            settings,
          });
        }
        return { ok: false, error, aborted };
      } finally {
        if (activeSubmit.current === controller) activeSubmit.current = undefined;
      }
    },
    [port, state]
  );

  const resetError = useCallback((): void => dispatch({ type: 'error-reset' }), []);

  return { state, reloadSettings, submit, resetError };
}

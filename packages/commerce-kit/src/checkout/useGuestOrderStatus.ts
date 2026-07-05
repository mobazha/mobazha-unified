import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { CommerceGuestOrderStatusPort } from './guestOrderStatus';
import {
  INITIAL_COMMERCE_GUEST_ORDER_STATE,
  commerceGuestOrderFromLifecycle,
  commerceGuestOrderLifecycleReducer,
  shouldPollCommerceGuestOrder,
  type CommerceGuestOrderLifecycleState,
} from './guestOrderLifecycle';

export interface UseGuestOrderStatusOptions {
  poll?: boolean;
  pollIntervalMs?: number;
}

export interface UseGuestOrderStatusResult {
  state: CommerceGuestOrderLifecycleState;
  reload(): Promise<void>;
}

/** React binding for cancellable public status loading and terminal-aware polling. */
export function useGuestOrderStatus(
  port: CommerceGuestOrderStatusPort,
  orderToken: string | undefined,
  options: UseGuestOrderStatusOptions = {}
): UseGuestOrderStatusResult {
  const [state, dispatch] = useReducer(
    commerceGuestOrderLifecycleReducer,
    INITIAL_COMMERCE_GUEST_ORDER_STATE
  );
  const activeRequest = useRef<AbortController | undefined>(undefined);
  const requestSequence = useRef(0);

  const reload = useCallback(async (): Promise<void> => {
    activeRequest.current?.abort();
    const sequence = ++requestSequence.current;
    if (!orderToken) {
      dispatch({ type: 'reset' });
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    dispatch({ type: 'load-started', orderToken });
    try {
      const order = await port.getOrder(orderToken, { signal: controller.signal });
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      dispatch({ type: 'order-loaded', orderToken, order });
    } catch (error) {
      if (controller.signal.aborted || sequence !== requestSequence.current) return;
      dispatch({ type: 'load-failed', orderToken, error });
    } finally {
      if (activeRequest.current === controller) activeRequest.current = undefined;
    }
  }, [orderToken, port]);

  useEffect(() => {
    dispatch({ type: 'reset' });
    void reload();
    return () => {
      requestSequence.current += 1;
      activeRequest.current?.abort();
    };
  }, [reload]);

  const order = commerceGuestOrderFromLifecycle(state, orderToken);
  const shouldPoll = options.poll ?? true;
  const pollIntervalMs = Math.max(1_000, options.pollIntervalMs ?? 15_000);

  useEffect(() => {
    if (!shouldPoll || !orderToken) return;
    if (state.status !== 'ready' && state.status !== 'error') return;
    if (order && !shouldPollCommerceGuestOrder(order.state)) return;
    const timeout = setTimeout(() => void reload(), pollIntervalMs);
    return () => clearTimeout(timeout);
  }, [order, orderToken, pollIntervalMs, reload, shouldPoll, state.status]);

  return { state, reload };
}

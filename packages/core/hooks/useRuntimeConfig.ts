'use client';

import { useSyncExternalStore } from 'react';
import {
  getRuntimeConfig,
  getServerRuntimeConfig,
  subscribeRuntimeConfig,
  type RuntimeConfig,
  type RuntimePaymentFlow,
  type RuntimePaymentKind,
} from '../config/runtimeConfig';

export function useRuntimeConfig(): RuntimeConfig {
  return useSyncExternalStore(subscribeRuntimeConfig, getRuntimeConfig, getServerRuntimeConfig);
}

export function useRuntimePaymentKind(kind: RuntimePaymentKind): boolean {
  const config = useRuntimeConfig();
  if (config.schemaVersion < 2) return false;
  return config.capabilities.payments.methods.some(method => method.kind === kind);
}

export function useRuntimePaymentFlow(flow: RuntimePaymentFlow): boolean {
  const config = useRuntimeConfig();
  if (config.schemaVersion < 2) return false;
  return config.capabilities.payments.methods.some(method => method.flow === flow);
}

export function useFiatPaymentVisible(): boolean {
  return useRuntimePaymentKind('fiat');
}

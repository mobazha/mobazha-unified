'use client';

import { useSyncExternalStore } from 'react';
import {
  getRuntimeConfig,
  getServerRuntimeConfig,
  subscribeRuntimeConfig,
  type RuntimeConfig,
  type RuntimePaymentKind,
} from '../config/runtimeConfig';
import { supportsFiatPayments } from '../edition/capabilities';

export function useRuntimeConfig(): RuntimeConfig {
  return useSyncExternalStore(subscribeRuntimeConfig, getRuntimeConfig, getServerRuntimeConfig);
}

export function useRuntimePaymentKind(kind: RuntimePaymentKind): boolean {
  const config = useRuntimeConfig();
  if (config.schemaVersion < 2) return false;
  return config.capabilities.payments.methods.some(method => method.kind === kind);
}

export function useFiatPaymentVisible(): boolean {
  const runtimeVisible = useRuntimePaymentKind('fiat');
  return supportsFiatPayments() && runtimeVisible;
}

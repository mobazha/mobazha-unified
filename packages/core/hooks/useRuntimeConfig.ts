'use client';

import { useSyncExternalStore } from 'react';
import {
  getRuntimeConfig,
  getRuntimeConfigStatus,
  getServerRuntimeConfig,
  getServerRuntimeConfigStatus,
  subscribeRuntimeConfig,
  supportsRuntimeCapability,
  type RuntimeCapabilityKey,
  type RuntimeConfig,
  type RuntimeConfigStatus,
  type RuntimePaymentFlow,
  type RuntimePaymentKind,
} from '../config/runtimeConfig';

export function useRuntimeConfig(): RuntimeConfig {
  return useSyncExternalStore(subscribeRuntimeConfig, getRuntimeConfig, getServerRuntimeConfig);
}

export function useRuntimeConfigStatus(): RuntimeConfigStatus {
  return useSyncExternalStore(
    subscribeRuntimeConfig,
    getRuntimeConfigStatus,
    getServerRuntimeConfigStatus
  );
}

export function useRuntimePaymentKind(kind: RuntimePaymentKind): boolean {
  const config = useRuntimeConfig();
  return config.capabilities.payments.methods.some(method => method.kind === kind);
}

export function useRuntimePaymentFlow(flow: RuntimePaymentFlow): boolean {
  const config = useRuntimeConfig();
  return config.capabilities.payments.methods.some(method => method.flow === flow);
}

export function useRuntimeCapability(capability: RuntimeCapabilityKey): boolean {
  return supportsRuntimeCapability(capability, useRuntimeConfig());
}

export function useFiatPaymentVisible(): boolean {
  return useRuntimePaymentKind('fiat');
}

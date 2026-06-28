/**
 * Versioned runtime bootstrap shared by Next.js, Vite, and browser extensions.
 * The backend describes product capabilities; authorization remains server-side.
 */

export type RuntimeAuthMode = 'hosted' | 'basic' | 'standalone';
export type RuntimePaymentKind = 'crypto' | 'fiat';
export type RuntimePaymentFlow = 'address-transfer' | 'external-wallet' | 'provider-session';

export interface RuntimePaymentCapability {
  id: string;
  kind: RuntimePaymentKind;
  flow: RuntimePaymentFlow;
  addressMode?: string;
}

export interface RuntimeCapabilities {
  payments: {
    methods: RuntimePaymentCapability[];
  };
}

export interface RuntimeConfig {
  schemaVersion: number;
  authMode?: RuntimeAuthMode;
  saasUrl?: string;
  guestCheckoutEnabled?: boolean;
  outpostMode?: boolean;
  disableExternalResources?: boolean;
  brand?: Record<string, unknown>;
  features: Record<string, unknown>;
  capabilities: RuntimeCapabilities;
}

type Listener = () => void;

const SERVER_RUNTIME_CONFIG: RuntimeConfig = {
  schemaVersion: 1,
  features: {},
  capabilities: { payments: { methods: [] } },
};
let currentConfig: RuntimeConfig = SERVER_RUNTIME_CONFIG;
const listeners = new Set<Listener>();

function normalizePaymentCapability(value: unknown): RuntimePaymentCapability | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const id = typeof input.id === 'string' ? input.id.trim() : '';
  const kind = input.kind;
  const flow = input.flow;
  if (!id || (kind !== 'crypto' && kind !== 'fiat')) return null;
  if (flow !== 'address-transfer' && flow !== 'external-wallet' && flow !== 'provider-session') {
    return null;
  }
  return {
    id,
    kind,
    flow,
    ...(typeof input.addressMode === 'string' && input.addressMode.trim()
      ? { addressMode: input.addressMode.trim() }
      : {}),
  };
}

function normalizeRuntimeConfig(raw: unknown): RuntimeConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 1,
      features: {},
      capabilities: { payments: { methods: [] } },
    };
  }

  const input = raw as Record<string, unknown>;
  const rawCapabilities =
    input.capabilities && typeof input.capabilities === 'object'
      ? (input.capabilities as Record<string, unknown>)
      : {};
  const rawPayments =
    rawCapabilities.payments && typeof rawCapabilities.payments === 'object'
      ? (rawCapabilities.payments as Record<string, unknown>)
      : {};
  const methods = Array.isArray(rawPayments.methods)
    ? rawPayments.methods
        .map(normalizePaymentCapability)
        .filter((method): method is RuntimePaymentCapability => method !== null)
    : [];

  const authMode = input.authMode;
  return {
    schemaVersion:
      typeof input.schemaVersion === 'number' && Number.isFinite(input.schemaVersion)
        ? input.schemaVersion
        : 1,
    ...(authMode === 'hosted' || authMode === 'basic' || authMode === 'standalone'
      ? { authMode }
      : {}),
    ...(typeof input.saasUrl === 'string' ? { saasUrl: input.saasUrl } : {}),
    ...(typeof input.guestCheckoutEnabled === 'boolean'
      ? { guestCheckoutEnabled: input.guestCheckoutEnabled }
      : {}),
    ...(typeof input.outpostMode === 'boolean' ? { outpostMode: input.outpostMode } : {}),
    ...(typeof input.disableExternalResources === 'boolean'
      ? { disableExternalResources: input.disableExternalResources }
      : {}),
    ...(input.brand && typeof input.brand === 'object'
      ? { brand: input.brand as Record<string, unknown> }
      : {}),
    features:
      input.features && typeof input.features === 'object'
        ? (input.features as Record<string, unknown>)
        : {},
    capabilities: { payments: { methods } },
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function readRuntimeConfigFromWindow(): RuntimeConfig {
  if (typeof window === 'undefined') return normalizeRuntimeConfig(undefined);
  const raw = (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  return normalizeRuntimeConfig(raw);
}

export function initializeRuntimeConfigFromWindow(): RuntimeConfig {
  return initializeRuntimeConfig(readRuntimeConfigFromWindow());
}

export function initializeRuntimeConfig(raw: unknown): RuntimeConfig {
  currentConfig = normalizeRuntimeConfig(raw);
  emit();
  return currentConfig;
}

/** Merge a refreshed backend snapshot without changing compile-time endpoint configuration. */
export function mergeRuntimeConfig(raw: unknown): RuntimeConfig {
  const next = normalizeRuntimeConfig(raw);
  currentConfig = {
    ...currentConfig,
    schemaVersion: Math.max(currentConfig.schemaVersion, next.schemaVersion),
    features: next.features,
    capabilities: next.capabilities,
  };
  emit();
  return currentConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  return currentConfig;
}

export function getServerRuntimeConfig(): RuntimeConfig {
  return SERVER_RUNTIME_CONFIG;
}

export function subscribeRuntimeConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasRuntimePaymentCapabilities(): boolean {
  return currentConfig.schemaVersion >= 2;
}

export function getRuntimePaymentCapabilities(): readonly RuntimePaymentCapability[] {
  return currentConfig.capabilities.payments.methods;
}

export function supportsRuntimePaymentKind(
  kind: RuntimePaymentKind,
  legacyDefault = false
): boolean {
  if (!hasRuntimePaymentCapabilities()) return legacyDefault;
  return getRuntimePaymentCapabilities().some(method => method.kind === kind);
}

export function supportsRuntimePaymentMethod(id: string, kind: RuntimePaymentKind): boolean {
  if (!hasRuntimePaymentCapabilities()) return true;
  const expected = kind === 'crypto' ? id.trim().toUpperCase() : id.trim().toLowerCase();
  return getRuntimePaymentCapabilities().some(method => {
    if (method.kind !== kind) return false;
    const actual = kind === 'crypto' ? method.id.toUpperCase() : method.id.toLowerCase();
    return actual === expected;
  });
}

/**
 * Versioned runtime bootstrap shared by Next.js, Vite, and browser extensions.
 * The backend describes product capabilities; authorization remains server-side.
 */

export const RUNTIME_CONFIG_SCHEMA_VERSION = 3 as const;

export type RuntimeAuthMode = 'hosted' | 'basic' | 'standalone';
export type RuntimeDeploymentMode = 'hosted' | 'standalone' | 'outpost';
export type RuntimeExperienceKind = 'platform' | 'store' | 'marketplace';
export type RuntimeConfigStatus = 'invalid' | 'pending' | 'refreshing' | 'ready' | 'error';
export type RuntimePaymentKind = 'crypto' | 'fiat';
export type RuntimePaymentFlow = 'address-transfer' | 'external-wallet' | 'provider-session';

export interface RuntimePaymentCapability {
  id: string;
  kind: RuntimePaymentKind;
  flow: RuntimePaymentFlow;
  addressMode?: string;
}

export interface RuntimeDeployment {
  mode: RuntimeDeploymentMode;
  allowExternalResources: boolean;
}

export interface RuntimeExperience {
  kind: RuntimeExperienceKind;
  marketplaceIdentifier?: string;
}

export interface RuntimeCapabilities {
  commerce: {
    storefront: boolean;
    storeAdmin: boolean;
    checkout: boolean;
  };
  marketplace: {
    discovery: boolean;
    operator: boolean;
    selling: boolean;
    curation: boolean;
    sellerReview: boolean;
    customDomains: boolean;
    releasePublishing: boolean;
    attribution: boolean;
  };
  outpost: {
    isolatedRuntime: boolean;
    managedFleet: boolean;
  };
  payments: {
    methods: RuntimePaymentCapability[];
  };
}

export type RuntimeCapabilityKey =
  | 'commerce.storefront'
  | 'commerce.storeAdmin'
  | 'commerce.checkout'
  | 'marketplace.discovery'
  | 'marketplace.operator'
  | 'marketplace.selling'
  | 'marketplace.curation'
  | 'marketplace.sellerReview'
  | 'marketplace.customDomains'
  | 'marketplace.releasePublishing'
  | 'marketplace.attribution'
  | 'outpost.isolatedRuntime'
  | 'outpost.managedFleet';

export interface RuntimeConfig {
  schemaVersion: typeof RUNTIME_CONFIG_SCHEMA_VERSION;
  edition?: string;
  authMode: RuntimeAuthMode;
  saasUrl?: string;
  deployment: RuntimeDeployment;
  experience: RuntimeExperience;
  /** True only when capabilities came from an authoritative backend snapshot. */
  capabilitiesReady: boolean;
  brand?: Record<string, unknown>;
  features: Record<string, unknown>;
  capabilities: RuntimeCapabilities;
}

type Listener = () => void;

function emptyCapabilities(): RuntimeCapabilities {
  return {
    commerce: { storefront: false, storeAdmin: false, checkout: false },
    marketplace: {
      discovery: false,
      operator: false,
      selling: false,
      curation: false,
      sellerReview: false,
      customDomains: false,
      releasePublishing: false,
      attribution: false,
    },
    outpost: { isolatedRuntime: false, managedFleet: false },
    payments: { methods: [] },
  };
}

function defaultRuntimeConfig(): RuntimeConfig {
  return {
    schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
    authMode: 'standalone',
    deployment: { mode: 'standalone', allowExternalResources: false },
    experience: { kind: 'store' },
    capabilitiesReady: false,
    features: {},
    capabilities: emptyCapabilities(),
  };
}

const SERVER_RUNTIME_CONFIG: RuntimeConfig = defaultRuntimeConfig();
let currentConfig: RuntimeConfig = defaultRuntimeConfig();
let currentStatus: RuntimeConfigStatus = 'invalid';
let shellConfigValid = false;
const listeners = new Set<Listener>();

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function bool(value: unknown): boolean {
  return value === true;
}

function normalizePaymentCapability(value: unknown): RuntimePaymentCapability | null {
  const input = asRecord(value);
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

function parseRuntimeConfig(raw: unknown): RuntimeConfig | null {
  const input = asRecord(raw);
  if (input.schemaVersion !== RUNTIME_CONFIG_SCHEMA_VERSION) {
    return null;
  }

  const rawDeployment = asRecord(input.deployment);
  const deploymentMode = rawDeployment.mode;
  if (
    deploymentMode !== 'hosted' &&
    deploymentMode !== 'standalone' &&
    deploymentMode !== 'outpost'
  ) {
    return null;
  }

  const rawExperience = asRecord(input.experience);
  const experienceKind = rawExperience.kind;
  if (
    experienceKind !== 'platform' &&
    experienceKind !== 'store' &&
    experienceKind !== 'marketplace'
  ) {
    return null;
  }
  const marketplaceIdentifier =
    typeof rawExperience.marketplaceIdentifier === 'string'
      ? rawExperience.marketplaceIdentifier.trim()
      : '';
  if (experienceKind === 'marketplace' && !marketplaceIdentifier) {
    return null;
  }

  const authMode = input.authMode;
  if (authMode !== 'hosted' && authMode !== 'basic' && authMode !== 'standalone') {
    return null;
  }

  const rawCapabilities = asRecord(input.capabilities);
  const rawCommerce = asRecord(rawCapabilities.commerce);
  const rawMarketplace = asRecord(rawCapabilities.marketplace);
  const rawOutpost = asRecord(rawCapabilities.outpost);
  const rawPayments = asRecord(rawCapabilities.payments);
  const methods = Array.isArray(rawPayments.methods)
    ? rawPayments.methods
        .map(normalizePaymentCapability)
        .filter((method): method is RuntimePaymentCapability => method !== null)
    : [];

  return {
    schemaVersion: RUNTIME_CONFIG_SCHEMA_VERSION,
    ...(typeof input.edition === 'string' && input.edition.trim()
      ? { edition: input.edition.trim() }
      : {}),
    authMode,
    ...(typeof input.saasUrl === 'string' && input.saasUrl.trim()
      ? { saasUrl: input.saasUrl.trim() }
      : {}),
    deployment: {
      mode: deploymentMode,
      allowExternalResources: bool(rawDeployment.allowExternalResources),
    },
    experience: {
      kind: experienceKind,
      ...(marketplaceIdentifier ? { marketplaceIdentifier } : {}),
    },
    capabilitiesReady: bool(input.capabilitiesReady),
    ...(input.brand && typeof input.brand === 'object'
      ? { brand: input.brand as Record<string, unknown> }
      : {}),
    features: asRecord(input.features),
    capabilities: {
      commerce: {
        storefront: bool(rawCommerce.storefront),
        storeAdmin: bool(rawCommerce.storeAdmin),
        checkout: bool(rawCommerce.checkout),
      },
      marketplace: {
        discovery: bool(rawMarketplace.discovery),
        operator: bool(rawMarketplace.operator),
        selling: bool(rawMarketplace.selling),
        curation: bool(rawMarketplace.curation),
        sellerReview: bool(rawMarketplace.sellerReview),
        customDomains: bool(rawMarketplace.customDomains),
        releasePublishing: bool(rawMarketplace.releasePublishing),
        attribution: bool(rawMarketplace.attribution),
      },
      outpost: {
        isolatedRuntime: bool(rawOutpost.isolatedRuntime),
        managedFleet: bool(rawOutpost.managedFleet),
      },
      payments: { methods },
    },
  };
}

function normalizeRuntimeConfig(raw: unknown): RuntimeConfig {
  return parseRuntimeConfig(raw) ?? defaultRuntimeConfig();
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function readRuntimeConfigFromWindow(): RuntimeConfig {
  if (typeof window === 'undefined') return defaultRuntimeConfig();
  const raw = (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  return normalizeRuntimeConfig(raw);
}

export function initializeRuntimeConfigFromWindow(): RuntimeConfig {
  const raw =
    typeof window === 'undefined'
      ? undefined
      : (window as unknown as { __RUNTIME_CONFIG__?: unknown }).__RUNTIME_CONFIG__;
  return initializeRuntimeConfig(raw);
}

export function initializeRuntimeConfig(raw: unknown): RuntimeConfig {
  const parsed = parseRuntimeConfig(raw);
  shellConfigValid = parsed !== null;
  currentConfig = parsed ?? defaultRuntimeConfig();
  currentStatus = parsed ? (parsed.capabilitiesReady ? 'ready' : 'pending') : 'invalid';
  emit();
  return currentConfig;
}

export function beginRuntimeConfigRefresh(): void {
  if (currentStatus !== 'ready') {
    currentStatus = 'refreshing';
    emit();
  }
}

export function failRuntimeConfigRefresh(): void {
  if (currentStatus !== 'ready') {
    currentStatus = 'error';
    emit();
  }
}

/**
 * Merge a refreshed backend snapshot while preserving shell-owned deployment,
 * experience, auth transport, and branding selected before React mounts.
 */
export function mergeRuntimeConfig(raw: unknown): RuntimeConfig {
  const next = parseRuntimeConfig(raw);
  if (!next || !next.capabilitiesReady) {
    failRuntimeConfigRefresh();
    return currentConfig;
  }
  if (!shellConfigValid) {
    currentConfig = next;
    shellConfigValid = true;
  } else {
    currentConfig = {
      ...currentConfig,
      edition: next.edition,
      capabilitiesReady: true,
      features: next.features,
      capabilities: next.capabilities,
    };
  }
  currentStatus = 'ready';
  emit();
  return currentConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  return currentConfig;
}

export function getServerRuntimeConfig(): RuntimeConfig {
  return SERVER_RUNTIME_CONFIG;
}

export function getRuntimeConfigStatus(): RuntimeConfigStatus {
  return currentStatus;
}

export function getServerRuntimeConfigStatus(): RuntimeConfigStatus {
  return 'pending';
}

export function hasValidRuntimeShell(): boolean {
  return shellConfigValid;
}

export function subscribeRuntimeConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRuntimePaymentCapabilities(
  config: RuntimeConfig = currentConfig
): readonly RuntimePaymentCapability[] {
  return config.capabilities.payments.methods;
}

export function hasRuntimePaymentCapabilities(config: RuntimeConfig = currentConfig): boolean {
  return config.capabilitiesReady;
}

export function supportsRuntimePaymentKind(
  kind: RuntimePaymentKind,
  config: RuntimeConfig = currentConfig
): boolean {
  return getRuntimePaymentCapabilities(config).some(method => method.kind === kind);
}

export function supportsRuntimePaymentMethod(
  id: string,
  kind: RuntimePaymentKind,
  config: RuntimeConfig = currentConfig
): boolean {
  const expected = kind === 'crypto' ? id.trim().toUpperCase() : id.trim().toLowerCase();
  return getRuntimePaymentCapabilities(config).some(method => {
    if (method.kind !== kind) return false;
    const actual = kind === 'crypto' ? method.id.toUpperCase() : method.id.toLowerCase();
    return actual === expected;
  });
}

export function supportsRuntimeCapability(
  capability: RuntimeCapabilityKey,
  config: RuntimeConfig = currentConfig
): boolean {
  switch (capability) {
    case 'commerce.storefront':
      return config.capabilities.commerce.storefront;
    case 'commerce.storeAdmin':
      return config.capabilities.commerce.storeAdmin;
    case 'commerce.checkout':
      return config.capabilities.commerce.checkout;
    case 'marketplace.discovery':
      return config.capabilities.marketplace.discovery;
    case 'marketplace.operator':
      return config.capabilities.marketplace.operator;
    case 'marketplace.selling':
      return config.capabilities.marketplace.selling;
    case 'marketplace.curation':
      return config.capabilities.marketplace.curation;
    case 'marketplace.sellerReview':
      return config.capabilities.marketplace.sellerReview;
    case 'marketplace.customDomains':
      return config.capabilities.marketplace.customDomains;
    case 'marketplace.releasePublishing':
      return config.capabilities.marketplace.releasePublishing;
    case 'marketplace.attribution':
      return config.capabilities.marketplace.attribution;
    case 'outpost.isolatedRuntime':
      return config.capabilities.outpost.isolatedRuntime;
    case 'outpost.managedFleet':
      return config.capabilities.outpost.managedFleet;
  }
}

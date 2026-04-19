/**
 * MVP-1 — Platform capability abstraction layer.
 *
 * Single import point for business code:
 *
 *     import { PlatformProvider, usePrimaryCTA, useBackAction, useConfirm,
 *              useHaptic, useShare, useCapabilities } from '@/lib/platform';
 *
 * Types for TypeScript consumers:
 *
 *     import type { PlatformCapabilities, PrimaryCTACapability,
 *                   BackActionCapability, ConfirmCapability, HapticCapability,
 *                   ShareCapability } from '@/lib/platform';
 *
 * Architecture: see `apps/web/src/lib/platform/README.md`
 * Spec:         docs/miniapp/MINIAPP_MVP_EXECUTION.md §3
 */

export type {
  PlatformCapabilities,
  PlatformChannel,
  PrimaryCTACapability,
  BackActionCapability,
  ConfirmCapability,
  ConfirmOptions,
  AlertOptions,
  HapticCapability,
  HapticImpactStyle,
  ShareCapability,
  ShareOptions,
  ShareResult,
} from './types';

export { PlatformProvider, useCapabilities, createAdapterForChannel } from './context';

export { usePrimaryCTA } from './hooks/usePrimaryCTA';
export { useBackAction } from './hooks/useBackAction';
export { useConfirm } from './hooks/useConfirm';
export { useHaptic } from './hooks/useHaptic';
export { useShare } from './hooks/useShare';

export { BackActionStack } from './backStack';

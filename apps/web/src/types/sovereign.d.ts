// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Build-time constant injected by Vite `define` when VITE_BUILD_TARGET=sovereign.
 * Always `false` in normal builds, `true` in Sovereign builds.
 * Use for compile-time dead code elimination — branches guarded by
 * `if (__SOVEREIGN__)` are tree-shaken in the opposite build.
 */
declare const __SOVEREIGN__: boolean;

/** True only for the Telegram routed-store Bridge bundle. */
declare const __ROUTED_TMA__: boolean;

/** True when the Sovereign shell is composed with a trusted commercial extension entry. */
declare const __COMMERCIAL_EXTENSION__: boolean;

declare module '@mobazha/commercial-extension' {
  import type { ComponentType } from 'react';

  export const FinancePage: ComponentType<unknown>;
  export const WalletPage: ComponentType<unknown>;
  export const WithdrawPage: ComponentType<unknown>;
  export const SecretsPage: ComponentType<unknown>;
  export const TransfersPage: ComponentType<unknown>;
  export const NodePoolPage: ComponentType<unknown>;
}

// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Build-time constant injected by Vite `define` when VITE_BUILD_TARGET=sovereign.
 * Always `false` in normal builds, `true` in Sovereign builds.
 * Use for compile-time dead code elimination — branches guarded by
 * `if (__SOVEREIGN__)` are tree-shaken in the opposite build.
 */
declare const __SOVEREIGN__: boolean;

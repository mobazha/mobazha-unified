/**
 * Build-time constant injected by Vite `define` when VITE_BUILD_TARGET=outpost.
 * Always `false` in normal builds, `true` in Outpost builds.
 * Use for compile-time dead code elimination — branches guarded by
 * `if (__OUTPOST__)` are tree-shaken in the opposite build.
 */
declare const __OUTPOST__: boolean;

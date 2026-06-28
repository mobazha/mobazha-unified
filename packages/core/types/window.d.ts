export {};

declare global {
  interface Window {
    /** Injected by browser wallet extensions; shape is vendor-specific. */
    ethereum?: unknown;
  }
}

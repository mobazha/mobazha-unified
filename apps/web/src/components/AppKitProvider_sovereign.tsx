/**
 * Sovereign stub — AppKit/Reown wallet connector is stripped at build time.
 * Sovereign uses direct LTC/XMR payments, not Web3 wallet connections.
 */
export function AppKitProvider({ children }: { children: import('react').ReactNode }) {
  return <>{children}</>;
}

export default AppKitProvider;

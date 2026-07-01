/**
 * Sovereign stub — Telegram Mini App provider is stripped at build time.
 */
export function TGMiniAppProvider({ children }: { children: import('react').ReactNode }) {
  return <>{children}</>;
}

export function TGBackButtonManager() {
  return null;
}

export function useTGMiniApp() {
  return {
    isTGMiniApp: false,
    webApp: null,
    isReady: false,
  };
}

export default TGMiniAppProvider;

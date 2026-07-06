import { resetApiConfig, setApiConfig } from './api/config';

const STORE_ROUTE_TOKEN_KEY = 'mobazha_store_route_token';
const STORE_ROUTE_PEER_ID_KEY = 'mobazha_store_route_peer_id';
const STORE_ROUTE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const PEER_ID_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{20,80}$/;

let currentRouteToken: string | null = null;
let currentPeerID: string | null = null;

export function setStoreRouteToken(routeToken: string): boolean {
  if (!STORE_ROUTE_TOKEN_PATTERN.test(routeToken)) return false;
  const previousRouteToken = getStoreRouteToken();
  if (previousRouteToken && previousRouteToken !== routeToken) {
    clearStoreRoutePeerID();
  }
  currentRouteToken = routeToken;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORE_ROUTE_TOKEN_KEY, routeToken);
    } catch {
      // Session storage is optional in restricted WebViews.
    }
  }
  resetApiConfig();
  setApiConfig({
    gatewayUrl: `/r/${routeToken}/v1`,
    searchUrl: `/r/${routeToken}/search-disabled`,
    mbzGatewayUrl: `/r/${routeToken}/gateway-disabled`,
  });
  return true;
}

export function setStoreRoutePeerID(peerID: string): boolean {
  if (!getStoreRouteToken() || !PEER_ID_PATTERN.test(peerID)) return false;
  currentPeerID = peerID;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORE_ROUTE_PEER_ID_KEY, peerID);
    } catch {
      // Session storage is optional in restricted WebViews.
    }
  }
  return true;
}

export function getStoreRoutePeerID(): string | null {
  if (currentPeerID) return currentPeerID;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORE_ROUTE_PEER_ID_KEY);
      if (stored && PEER_ID_PATTERN.test(stored)) {
        currentPeerID = stored;
        return stored;
      }
      if (stored) sessionStorage.removeItem(STORE_ROUTE_PEER_ID_KEY);
    } catch {
      // Session storage is optional in restricted WebViews.
    }
  }
  return null;
}

export function clearStoreRoutePeerID(): void {
  currentPeerID = null;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORE_ROUTE_PEER_ID_KEY);
    } catch {
      // Session storage is optional in restricted WebViews.
    }
  }
}

export function getStoreRouteToken(): string | null {
  if (currentRouteToken) return currentRouteToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORE_ROUTE_TOKEN_KEY);
      if (stored && STORE_ROUTE_TOKEN_PATTERN.test(stored)) {
        currentRouteToken = stored;
        return stored;
      }
      if (stored) sessionStorage.removeItem(STORE_ROUTE_TOKEN_KEY);
    } catch {
      // Session storage is optional in restricted WebViews.
    }
  }
  return null;
}

export function restoreStoreRoute(): boolean {
  const routeToken = getStoreRouteToken();
  return routeToken ? setStoreRouteToken(routeToken) : false;
}

export function clearStoreRoute(): void {
  currentRouteToken = null;
  clearStoreRoutePeerID();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORE_ROUTE_TOKEN_KEY);
    } catch {
      // Session storage is optional in restricted WebViews.
    }
  }
  resetApiConfig();
}

export const routedStoreContextService = {
  setStoreRouteToken,
  getStoreRouteToken,
  setStoreRoutePeerID,
  getStoreRoutePeerID,
  clearStoreRoutePeerID,
  restoreStoreRoute,
  clearStoreRoute,
};

export default routedStoreContextService;

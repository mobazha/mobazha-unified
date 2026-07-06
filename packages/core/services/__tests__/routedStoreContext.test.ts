import { beforeEach, describe, expect, it } from 'vitest';
import { getGatewayUrl } from '../api/config';
import {
  clearStoreRoute,
  getStoreRoutePeerID,
  getStoreRouteToken,
  restoreStoreRoute,
  setStoreRoutePeerID,
  setStoreRouteToken,
} from '../routedStoreContext';

const ROUTE_TOKEN = 'V7k3mQ2xN9pRt4YwLc8Hjg';
const OTHER_ROUTE_TOKEN = 'N4b8tR6pQ2xKm7YwLc3Hjg';

describe('routedStoreContext', () => {
  beforeEach(() => {
    clearStoreRoute();
    sessionStorage.clear();
  });

  it('uses session-only route state and updates the gateway base', () => {
    expect(setStoreRouteToken(ROUTE_TOKEN)).toBe(true);
    expect(getStoreRouteToken()).toBe(ROUTE_TOKEN);
    expect(getGatewayUrl()).toBe(`/r/${ROUTE_TOKEN}/v1`);
    expect(localStorage.getItem('mobazha_store_route_token')).toBeNull();
  });

  it('rejects enumerable or unsafe route values', () => {
    expect(setStoreRouteToken('003')).toBe(false);
    expect(setStoreRouteToken('../admin')).toBe(false);
    expect(getStoreRouteToken()).toBeNull();
  });

  it('keeps the bootstrapped peer ID session-only and clears it on route changes', () => {
    setStoreRouteToken(ROUTE_TOKEN);
    expect(setStoreRoutePeerID('12D3KooWFSEzTrATwBvP6xNmDqFreLkSinYKgbok5pDB1TJGACiq')).toBe(true);
    expect(getStoreRoutePeerID()).toBe('12D3KooWFSEzTrATwBvP6xNmDqFreLkSinYKgbok5pDB1TJGACiq');
    expect(localStorage.getItem('mobazha_store_route_peer_id')).toBeNull();

    setStoreRouteToken(OTHER_ROUTE_TOKEN);
    expect(getStoreRoutePeerID()).toBeNull();
  });

  it('rejects a peer ID before routing or outside the base58 alphabet', () => {
    expect(setStoreRoutePeerID('12D3KooWFSEzTrATwBvP6xNmDqFreLkSinYKgbok5pDB1TJGACiq')).toBe(false);
    setStoreRouteToken(ROUTE_TOKEN);
    expect(setStoreRoutePeerID('../admin')).toBe(false);
  });

  it('restores the route from session storage', () => {
    sessionStorage.setItem('mobazha_store_route_token', ROUTE_TOKEN);
    expect(restoreStoreRoute()).toBe(true);
    expect(getGatewayUrl()).toBe(`/r/${ROUTE_TOKEN}/v1`);
  });

  it('clears runtime routing state', () => {
    setStoreRouteToken(ROUTE_TOKEN);
    clearStoreRoute();
    expect(getStoreRouteToken()).toBeNull();
    expect(getGatewayUrl()).toBe('/v1');
  });
});

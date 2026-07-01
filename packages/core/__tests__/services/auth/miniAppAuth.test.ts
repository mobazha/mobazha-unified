import { describe, it, expect } from 'vitest';
import {
  isInitDataFresh,
  parseBindSessionFromStartParam,
  appendTelegramMiniAppStoreParams,
} from '../../../services/auth/miniAppAuth';

describe('isInitDataFresh', () => {
  it('returns false for undefined authDate', () => {
    expect(isInitDataFresh(undefined)).toBe(false);
  });

  it('returns false for 0 authDate', () => {
    expect(isInitDataFresh(0)).toBe(false);
  });

  it('returns true for authDate just now', () => {
    const nowUnix = Math.floor(Date.now() / 1000);
    expect(isInitDataFresh(nowUnix)).toBe(true);
  });

  it('returns true for authDate 1 hour ago', () => {
    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
    expect(isInitDataFresh(oneHourAgo)).toBe(true);
  });

  it('returns true for authDate 22 hours ago (within 23h limit)', () => {
    const twentyTwoHoursAgo = Math.floor(Date.now() / 1000) - 22 * 3600;
    expect(isInitDataFresh(twentyTwoHoursAgo)).toBe(true);
  });

  it('returns false for authDate 24 hours ago (beyond 23h limit)', () => {
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 3600;
    expect(isInitDataFresh(twentyFourHoursAgo)).toBe(false);
  });

  it('returns false for authDate 23 hours + 1 minute ago', () => {
    const past = Math.floor(Date.now() / 1000) - (23 * 3600 + 60);
    expect(isInitDataFresh(past)).toBe(false);
  });

  it('returns true at boundary (22h 59m ago)', () => {
    const boundary = Math.floor(Date.now() / 1000) - (22 * 3600 + 59 * 60);
    expect(isInitDataFresh(boundary)).toBe(true);
  });
});

describe('parseBindSessionFromStartParam', () => {
  it('returns null for undefined', () => {
    expect(parseBindSessionFromStartParam(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseBindSessionFromStartParam('')).toBeNull();
  });

  it('returns null for non-bind start_param', () => {
    expect(parseBindSessionFromStartParam('s_abc123')).toBeNull();
    expect(parseBindSessionFromStartParam('group_xyz')).toBeNull();
    expect(parseBindSessionFromStartParam('random')).toBeNull();
  });

  it('extracts session ID from bind_ prefix', () => {
    expect(parseBindSessionFromStartParam('bind_a1b2c3d4e5f6')).toBe('a1b2c3d4e5f6');
  });

  it('handles bind_ with short session ID', () => {
    expect(parseBindSessionFromStartParam('bind_abc')).toBe('abc');
  });

  it('returns empty string for bind_ with no session ID', () => {
    expect(parseBindSessionFromStartParam('bind_')).toBe('');
  });

  it('does not match partial bind prefix', () => {
    expect(parseBindSessionFromStartParam('binding_abc')).toBeNull();
    expect(parseBindSessionFromStartParam('bin_abc')).toBeNull();
  });

  it('is case-sensitive', () => {
    expect(parseBindSessionFromStartParam('BIND_abc')).toBeNull();
    expect(parseBindSessionFromStartParam('Bind_abc')).toBeNull();
  });
});

describe('appendTelegramMiniAppStoreParams', () => {
  it('appends store_peer_id and store_host after initData', () => {
    const base = 'user=x&auth_date=1&hash=h';
    const out = appendTelegramMiniAppStoreParams(base, {
      storePeerId: 'QmA',
      storeHost: 'shop.example.com',
    });
    expect(out.startsWith('user=x&auth_date=1&hash=h&')).toBe(true);
    expect(out).toContain('store_peer_id=QmA');
    expect(out).toMatch(/store_host=shop/);
  });

  it('returns initData unchanged when context empty', () => {
    expect(appendTelegramMiniAppStoreParams('a=1', undefined)).toBe('a=1');
    expect(appendTelegramMiniAppStoreParams('a=1', {})).toBe('a=1');
  });
});

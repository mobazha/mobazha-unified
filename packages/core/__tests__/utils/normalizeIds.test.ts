import { describe, expect, it } from 'vitest';
import {
  readStringField,
  resolveCaseID,
  resolveNotificationID,
  resolveOrderID,
  resolveOrderOrCaseID,
  resolvePeerID,
} from '../../utils/normalizeIds';

describe('normalizeIds', () => {
  it('prefers canonical *ID keys over legacy camelCase', () => {
    expect(resolveOrderID({ orderID: 'canonical', orderId: 'legacy' })).toBe('canonical');
    expect(resolveCaseID({ caseID: 'canonical', caseId: 'legacy' })).toBe('canonical');
    expect(resolvePeerID({ peerID: 'canonical', peerId: 'legacy' })).toBe('canonical');
  });

  it('falls back to legacy camelCase when canonical is absent', () => {
    expect(resolveOrderID({ orderId: 'legacy-only' })).toBe('legacy-only');
    expect(resolveCaseID({ caseId: 'legacy-case' })).toBe('legacy-case');
  });

  it('resolveOrderOrCaseID merges order and case identifiers', () => {
    expect(resolveOrderOrCaseID({ orderID: 'QmOrder' })).toBe('QmOrder');
    expect(resolveOrderOrCaseID({ caseID: 'QmCase' })).toBe('QmCase');
    expect(resolveOrderOrCaseID({})).toBe('');
  });

  it('resolveNotificationID reads both casings', () => {
    expect(resolveNotificationID({ notificationID: 'n-1' })).toBe('n-1');
    expect(resolveNotificationID({ notificationId: 'n-2' })).toBe('n-2');
  });

  it('readStringField skips empty strings and tries next key', () => {
    expect(readStringField({ orderID: '', orderId: 'fallback' }, 'orderID', 'orderId')).toBe(
      'fallback'
    );
  });
});

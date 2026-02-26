import { describe, it, expect } from 'vitest';
import {
  formatUserName,
  truncatePeerId,
  truncateAddress,
  formatNotificationName,
} from '../../utils/identity';

describe('formatUserName', () => {
  it('returns name when available', () => {
    expect(formatUserName({ name: 'TechStore' })).toBe('TechStore');
  });

  it('trims whitespace from name', () => {
    expect(formatUserName({ name: '  TechStore  ' })).toBe('TechStore');
  });

  it('prefers name over handle', () => {
    expect(formatUserName({ name: 'TechStore', handle: 'techstore' })).toBe('TechStore');
  });

  it('falls back to handle when name is empty', () => {
    expect(formatUserName({ handle: 'techstore' })).toBe('techstore');
    expect(formatUserName({ name: '', handle: 'techstore' })).toBe('techstore');
    expect(formatUserName({ name: '  ', handle: 'techstore' })).toBe('techstore');
  });

  it('falls back to truncated peerID when no name or handle', () => {
    expect(formatUserName({ peerID: 'QmY8tRnCds3WPCabcdefgh' })).toBe('QmY8…efgh');
  });

  it('adds prefix to truncated peerID', () => {
    expect(formatUserName({ peerID: 'QmY8tRnCds3WPCabcdefgh' }, { prefix: 'Store' })).toBe(
      'Store QmY8…efgh'
    );
  });

  it('returns fallback when data is null/undefined', () => {
    expect(formatUserName(null)).toBe('');
    expect(formatUserName(undefined)).toBe('');
    expect(formatUserName(null, { fallback: 'Seller' })).toBe('Seller');
  });

  it('returns fallback when all fields are empty', () => {
    expect(formatUserName({})).toBe('');
    expect(formatUserName({}, { fallback: 'Unknown User' })).toBe('Unknown User');
    expect(formatUserName({ name: '', handle: '', peerID: '' })).toBe('');
  });

  it('uses custom truncateChars', () => {
    expect(formatUserName({ peerID: 'QmY8tRnCds3WPCabcdefgh' }, { truncateChars: 6 })).toBe(
      'QmY8tR…cdefgh'
    );
  });

  it('does not truncate short peerIDs', () => {
    expect(formatUserName({ peerID: 'QmShort' })).toBe('QmShort');
    expect(formatUserName({ peerID: 'Qm' })).toBe('Qm');
  });
});

describe('truncatePeerId', () => {
  it('truncates long peer IDs with ellipsis char', () => {
    expect(truncatePeerId('QmY8tRnCds3WPCabcdefgh')).toBe('QmY8…efgh');
  });

  it('returns short IDs unchanged', () => {
    expect(truncatePeerId('QmABCDEF', 4)).toBe('QmABCDEF');
    expect(truncatePeerId('Qm')).toBe('Qm');
    expect(truncatePeerId('QmAB', 4)).toBe('QmAB');
  });

  it('returns empty string for empty input', () => {
    expect(truncatePeerId('')).toBe('');
  });

  it('supports custom char count', () => {
    expect(truncatePeerId('QmY8tRnCds3WPCabcdefgh', 6)).toBe('QmY8tR…cdefgh');
  });
});

describe('truncateAddress', () => {
  const addr = '0x1234567890abcdef1234567890abcdef12345678';

  it('truncates with default params (6...4)', () => {
    expect(truncateAddress(addr)).toBe('0x1234...5678');
  });

  it('supports custom start/end chars', () => {
    expect(truncateAddress(addr, 10, 6)).toBe('0x12345678...345678');
  });

  it('returns short addresses unchanged', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
  });

  it('returns empty string for empty input', () => {
    expect(truncateAddress('')).toBe('');
  });
});

describe('formatNotificationName', () => {
  it('formats handle with @ prefix', () => {
    expect(formatNotificationName({ handle: 'alice' })).toBe('@alice');
  });

  it('prefers handle over name for notifications', () => {
    expect(formatNotificationName({ handle: 'alice', name: 'Alice' })).toBe('@alice');
  });

  it('falls back to name when no handle', () => {
    expect(formatNotificationName({ name: 'Alice' })).toBe('Alice');
  });

  it('falls back to truncated peerID', () => {
    expect(formatNotificationName({ peerID: 'QmY8tRnCds3WPCabcdefgh' })).toBe('QmY8…efgh');
  });

  it('returns empty string when no data available', () => {
    expect(formatNotificationName(null)).toBe('');
    expect(formatNotificationName(undefined)).toBe('');
    expect(formatNotificationName({})).toBe('');
    expect(formatNotificationName({ handle: '', name: '', peerID: '' })).toBe('');
  });
});

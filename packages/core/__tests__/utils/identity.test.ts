import { describe, it, expect } from 'vitest';
import {
  formatUserName,
  truncatePeerId,
  truncateAddress,
  formatNotificationName,
  isFullPeerID,
  hasPeerIDPrefix,
  identityNameProps,
  IDENTITY_NAME_CLASS,
  resolveProductCardSellerDisplay,
} from '../../utils/identity';

describe('isFullPeerID', () => {
  it('accepts full libp2p peer IDs', () => {
    expect(isFullPeerID('12D3KooWLYPUhoYt48FsocbqbD7CntQd1UgdEceZdKV9DVqXG2k8')).toBe(true);
  });

  it('rejects truncated display IDs', () => {
    expect(isFullPeerID('.YPUHoYt48FsocbqbD7CntQd1UgdEceZdKV9DVqXG2k8')).toBe(false);
  });

  it('rejects empty and whitespace input', () => {
    expect(isFullPeerID('')).toBe(false);
    expect(isFullPeerID('   ')).toBe(false);
    expect(isFullPeerID(undefined)).toBe(false);
  });
});

describe('hasPeerIDPrefix', () => {
  it('accepts known peer ID prefixes', () => {
    expect(hasPeerIDPrefix('QmSellerPeer')).toBe(true);
    expect(hasPeerIDPrefix('12D3KooWLYPUhoYt48FsocbqbD7CntQd1UgdEceZdKV9DVqXG2k8')).toBe(true);
  });

  it('rejects non-peer values', () => {
    expect(hasPeerIDPrefix('wireless-headphones')).toBe(false);
    expect(hasPeerIDPrefix('')).toBe(false);
    expect(hasPeerIDPrefix(undefined)).toBe(false);
  });
});

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

describe('resolveProductCardSellerDisplay', () => {
  const fullPeerID = '12D3KooWLYPUhoYt48FsocbqbD7CntQd1UgdEceZdKV9DVqXG2k8';

  it('prefers profileName over listing name and handle', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        profileName: 'Profile Shop',
        name: 'Listing Shop',
        handle: 'listing-handle',
      })
    ).toEqual({ name: 'Profile Shop', avatarUrl: undefined });
  });

  it('falls back to listing name then handle', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: 'Listing Shop',
        handle: 'listing-handle',
      })
    ).toEqual({ name: 'Listing Shop', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        handle: 'listing-handle',
      })
    ).toEqual({ name: 'listing-handle', avatarUrl: undefined });
  });

  it('trims name candidates', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        profileName: '  Profile Shop  ',
      })
    ).toEqual({ name: 'Profile Shop', avatarUrl: undefined });
  });

  it('prefers profileAvatarUrl over listing avatarUrl', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: 'Shop',
        profileAvatarUrl: 'https://example.com/profile.png',
        avatarUrl: 'https://example.com/listing.png',
      })
    ).toEqual({
      name: 'Shop',
      avatarUrl: 'https://example.com/profile.png',
    });
  });

  it('uses listing avatar when profile avatar is missing', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: 'Shop',
        avatarUrl: 'https://example.com/listing.png',
      })
    ).toEqual({
      name: 'Shop',
      avatarUrl: 'https://example.com/listing.png',
    });
  });

  it('rejects raw peer ID and peer-ID-shaped listing names', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: fullPeerID,
        handle: 'readable-handle',
      })
    ).toEqual({ name: 'readable-handle', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: fullPeerID,
      })
    ).toEqual({ name: '', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        name: fullPeerID,
      })
    ).toEqual({ name: '', avatarUrl: undefined });
  });

  it('rejects Unicode-ellipsis truncated peer IDs and falls through to handle', () => {
    const ipfsPeerID = 'QmY8tRnCds3WPCabcdefgh';
    expect(
      resolveProductCardSellerDisplay({
        peerID: ipfsPeerID,
        name: 'QmY8…efgh',
        handle: 'card-shop',
      })
    ).toEqual({ name: 'card-shop', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: '12D3Ko…iK21',
        handle: 'libp2p-shop',
      })
    ).toEqual({ name: 'libp2p-shop', avatarUrl: undefined });
  });

  it('rejects three-dot truncated peer IDs and falls through to handle', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: '12D3...iK21',
        handle: 'readable-handle',
      })
    ).toEqual({ name: 'readable-handle', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: '12D3...iK21',
      })
    ).toEqual({ name: '', avatarUrl: undefined });
  });

  it('rejects prefix-only Unicode-ellipsis truncated peer IDs', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: '12D3…iK21',
        handle: 'ellipsis-handle',
      })
    ).toEqual({ name: 'ellipsis-handle', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: 'QmY8tRnCds3WPCabcdefgh',
        name: 'Qm…efgh',
        handle: 'ipfs-handle',
      })
    ).toEqual({ name: 'ipfs-handle', avatarUrl: undefined });
  });

  it('rejects listing names equal to common truncations of peerID', () => {
    const ipfsPeerID = 'QmY8tRnCds3WPCabcdefgh';
    expect(
      resolveProductCardSellerDisplay({
        peerID: ipfsPeerID,
        name: truncatePeerId(ipfsPeerID),
        handle: 'fallback-handle',
      })
    ).toEqual({ name: 'fallback-handle', avatarUrl: undefined });
  });

  it('keeps ordinary merchant names that are not truncated peer IDs', () => {
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: 'Tech Collectibles',
      })
    ).toEqual({ name: 'Tech Collectibles', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: 'QmShop Corner',
      })
    ).toEqual({ name: 'QmShop Corner', avatarUrl: undefined });

    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: 'Tech...Collectibles',
      })
    ).toEqual({ name: 'Tech...Collectibles', avatarUrl: undefined });
  });

  it('returns empty name when no readable seller label exists', () => {
    expect(resolveProductCardSellerDisplay({ peerID: fullPeerID })).toEqual({
      name: '',
      avatarUrl: undefined,
    });
    expect(
      resolveProductCardSellerDisplay({
        peerID: fullPeerID,
        name: '   ',
        handle: '',
      })
    ).toEqual({ name: '', avatarUrl: undefined });
  });
});

describe('identityNameProps', () => {
  it('returns translate=no and notranslate class by default', () => {
    expect(identityNameProps()).toEqual({
      translate: 'no',
      className: IDENTITY_NAME_CLASS,
    });
  });

  it('merges notranslate with existing className', () => {
    expect(identityNameProps('font-bold truncate')).toEqual({
      translate: 'no',
      className: `${IDENTITY_NAME_CLASS} font-bold truncate`,
    });
  });

  it('does not duplicate notranslate when already present', () => {
    expect(identityNameProps('notranslate font-bold')).toEqual({
      translate: 'no',
      className: 'notranslate font-bold',
    });
  });
});

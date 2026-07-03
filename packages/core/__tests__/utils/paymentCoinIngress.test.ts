import { describe, expect, it } from 'vitest';
import { lookupPaymentCoinAddress } from '../../utils/paymentCoinIngress';

const ETH_ASSET = 'crypto:eip155:1:native';

describe('lookupPaymentCoinAddress', () => {
  it('matches canonical and legacy map keys', () => {
    expect(lookupPaymentCoinAddress({ [ETH_ASSET]: '0xcanonical' }, ETH_ASSET)).toBe('0xcanonical');
    expect(lookupPaymentCoinAddress({ ETH: '0xlegacy' }, ETH_ASSET)).toBe('0xlegacy');
  });
});

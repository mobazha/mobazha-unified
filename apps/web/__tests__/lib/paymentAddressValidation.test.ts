import { describe, expect, it } from 'vitest';
import { validatePaymentAddressForChain } from '../../src/lib/paymentAddressValidation';

describe('validatePaymentAddressForChain', () => {
  it.each([
    ['BTC', '1BoatSLRHtKNngkdXEeobR76b53LETtpyT'],
    ['BCH', 'bitcoincash:qq4v32mtagxac29my6gwj6fd4tmqg8rysu23dax807'],
    ['LTC', 'LVg2kJoFNg45Nbpy53h7Fe1wKyeXVRhMH9'],
  ])('accepts a valid %s mainnet address', (chain, address) => {
    expect(validatePaymentAddressForChain(address, chain, 'prod')).toBe(true);
  });

  it.each([
    ['BTC', 'tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7'],
    ['BCH', 'mzBc4XEFSdzCDcTxAgf6EZXgsZWpztRhef'],
    ['LTC', 'tltc1qu78xur5xnq6fjy83amy0qcjfau8m367defyhms'],
  ])('accepts a valid %s testnet address', (chain, address) => {
    expect(validatePaymentAddressForChain(address, chain, 'testnet')).toBe(true);
    expect(validatePaymentAddressForChain(address, chain, 'prod')).toBe(false);
  });

  it('rejects invalid and unsupported addresses', () => {
    expect(validatePaymentAddressForChain('not-an-address', 'BTC')).toBe(false);
    expect(validatePaymentAddressForChain('1BoatSLRHtKNngkdXEeobR76b53LETtpyT', 'UNKNOWN')).toBe(
      false
    );
  });
});

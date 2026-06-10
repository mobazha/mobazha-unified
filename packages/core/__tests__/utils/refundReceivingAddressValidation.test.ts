import { describe, expect, it } from 'vitest';
import {
  getRefundReceivingAddressWarnings,
  validateRefundReceivingAddressInput,
} from '../../utils/refundReceivingAddressValidation';

const BTC_ASSET = 'crypto:bip122:000000000019d6689c085ae165831e93:native';
const BCH_ASSET = 'crypto:bitcoincash:mainnet:native';
const ETH_ASSET = 'crypto:eip155:1:native';

describe('validateRefundReceivingAddressInput', () => {
  it('accepts valid EVM address', () => {
    expect(
      validateRefundReceivingAddressInput(ETH_ASSET, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e')
    ).toEqual({ valid: true });
  });

  it('rejects invalid EVM address', () => {
    expect(validateRefundReceivingAddressInput(ETH_ASSET, 'not-an-address')).toEqual({
      valid: false,
      code: 'format',
    });
  });

  it('accepts permissive UTXO length', () => {
    expect(
      validateRefundReceivingAddressInput(BTC_ASSET, 'bc1qnsk5lxk26kqlt8up3l728f0men3ewfe8ds0ev5')
    ).toEqual({ valid: true });
  });

  it('rejects too-short UTXO address', () => {
    expect(validateRefundReceivingAddressInput(BTC_ASSET, 'bc1short')).toEqual({
      valid: false,
      code: 'format',
    });
  });
});

describe('getRefundReceivingAddressWarnings', () => {
  it('warns when address duplicates another coin entry', () => {
    const warnings = getRefundReceivingAddressWarnings(
      BCH_ASSET,
      'bc1qnsk5lxk26kqlt8up3l728f0men3ewfe8ds0ev5',
      { [BTC_ASSET]: 'bc1qnsk5lxk26kqlt8up3l728f0men3ewfe8ds0ev5' }
    );
    expect(warnings.some(w => w.type === 'duplicate_other_coin')).toBe(true);
  });

  it('warns when BCH uses bitcoin-native bc1 format', () => {
    const warnings = getRefundReceivingAddressWarnings(
      BCH_ASSET,
      'bc1qnsk5lxk26kqlt8up3l728f0men3ewfe8ds0ev5',
      {}
    );
    expect(warnings).toEqual([{ type: 'bch_bech32_mismatch' }]);
  });
});

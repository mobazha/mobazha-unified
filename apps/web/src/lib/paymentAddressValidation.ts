import BitcoinAddressValidator from 'multicoin-address-validator/src/bitcoin_validator';
import BitcoinCashAddressValidator from 'multicoin-address-validator/src/bch_validator';
import Base58AddressValidator from 'multicoin-address-validator/src/base58_validator';
import TronAddressValidator from 'multicoin-address-validator/src/tron_validator';
import { isEvmHexAddress } from '@mobazha/core';

export type PaymentAddressNetwork = 'prod' | 'testnet';

interface ValidatorConfig {
  addressTypes?: Record<PaymentAddressNetwork, string[]>;
  bech32Hrp?: Record<PaymentAddressNetwork, string[]>;
  regexp?: string;
  minLength?: number;
  maxLength?: number;
}

const UTXO_CONFIG: Record<string, ValidatorConfig> = {
  BTC: {
    addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4', '3c', '26'] },
    bech32Hrp: { prod: ['bc'], testnet: ['tb'] },
  },
  BCH: {
    regexp: '^[qQpP]{1}[0-9a-zA-Z]{41}$',
    addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4'] },
  },
  LTC: {
    addressTypes: { prod: ['30', '32'], testnet: ['6f', 'c4', '3a'] },
    bech32Hrp: { prod: ['ltc'], testnet: ['tltc'] },
  },
  ZEC: {
    addressTypes: { prod: ['1cb8', '1cbd'], testnet: ['1d25', '1cba'] },
  },
};

const SOLANA_CONFIG: ValidatorConfig = { minLength: 43, maxLength: 44 };

/** Validate only the chain families exposed by the public runtime catalog. */
export function validatePaymentAddressForChain(
  address: string,
  chainId: string,
  network: PaymentAddressNetwork = 'prod'
): boolean {
  const normalized = chainId.trim().toUpperCase();
  if (!address.trim()) return false;

  if (['ETH', 'BSC', 'BNB', 'BASE', 'MATIC', 'ARB', 'ARBITRUM'].includes(normalized)) {
    return isEvmHexAddress(address);
  }
  if (normalized === 'SOL') {
    return Base58AddressValidator.isValidAddress(address, SOLANA_CONFIG);
  }
  if (normalized === 'TRON' || normalized === 'TRX') {
    return TronAddressValidator.isValidAddress(address);
  }

  const config = UTXO_CONFIG[normalized];
  if (!config) return false;
  const options = { networkType: network };
  return normalized === 'BCH'
    ? BitcoinCashAddressValidator.isValidAddress(address, config, options)
    : BitcoinAddressValidator.isValidAddress(address, config, options);
}
